import { logger } from "../lib/logger";
import { db, user } from "../db";
import { payment as paymentClient } from "../billing/payment";
import { PLANS, type PlanName } from "../billing/plans";
import {
  addSubscriptionPeriodEnd,
  isSubscriptionPeriodTestMode,
  pendingChargeCooldownSince,
  renewalHorizonFromNow,
} from "../billing/subscription-period";
import { payment, subscription } from "../db/schema/billing";
import { eq, and, asc, gte, isNotNull, lte, or, inArray } from "drizzle-orm";

const PAID_PLANS = ["pro", "agency"] as const satisfies readonly PlanName[];

/**
 * Подписки, по которым можно вызывать рекуррент:
 * - только платные планы;
 * - есть RebillId, не отменена в конце периода;
 * - active: окно продления (renewalHorizonFromNow);
 * - past_due: повтор после отказа банка (тот же крон).
 * Без дубля Charge, если по подписке уже есть pending моложе pendingChargeCooldownSince.
 */
export const loadSubscriptionsEligibleForRebill = async (now: Date) => {
  const renewalHorizon = renewalHorizonFromNow(now);
  const pendingCooldownSince = pendingChargeCooldownSince(now);

  const candidates = await db.query.subscription.findMany({
    where: and(
      inArray(subscription.plan, PAID_PLANS),
      eq(subscription.autoRenew, true),
      eq(subscription.cancelAtPeriodEnd, false),
      isNotNull(subscription.rebillId),
      isNotNull(subscription.currentPeriodEnd),
      or(
        and(
          eq(subscription.status, "active"),
          lte(subscription.currentPeriodEnd, renewalHorizon),
        ),
        eq(subscription.status, "past_due"),
      ),
    ),
  });

  if (candidates.length === 0) {
    logger.info(
      {
        now: now.toISOString(),
        renewalHorizon: renewalHorizon.toISOString(),
        pendingCooldownSince: pendingCooldownSince.toISOString(),
        periodTest: isSubscriptionPeriodTestMode(),
        candidateCount: 0,
        dueCount: 0,
      },
      "charge-subscriptions: no candidates (rebillId / currentPeriodEnd in window / plan)",
    );
    return [];
  }

  const ids = candidates.map((s) => s.id);
  const pendingRows = await db
    .selectDistinct({ subscriptionId: payment.subscriptionId })
    .from(payment)
    .where(
      and(
        inArray(payment.subscriptionId, ids),
        eq(payment.status, "pending"),
        gte(payment.createdAt, pendingCooldownSince),
      ),
    );

  const pendingSubscriptionIds = new Set(
    pendingRows
      .map((r) => r.subscriptionId)
      .filter((id): id is string => id !== null),
  );

  const due = candidates.filter((s) => !pendingSubscriptionIds.has(s.id));

  logger.info(
    {
      now: now.toISOString(),
      renewalHorizon: renewalHorizon.toISOString(),
      pendingCooldownSince: pendingCooldownSince.toISOString(),
      periodTest: isSubscriptionPeriodTestMode(),
      candidateCount: candidates.length,
      dueCount: due.length,
    },
    "charge-subscriptions: candidates loaded",
  );

  return due;
};

/**
 * Pending после Charge (UNKNOWN) или если вебхук не дошёл / Confirm не прошёл.
 * Сверяем GetState и доводим до succeeded | failed, как вебхук.
 */
export const reconcilePendingSubscriptionPayments = async (now: Date) => {
  const rows = await db.query.payment.findMany({
    where: and(
      eq(payment.status, "pending"),
      eq(payment.type, "subscription"),
      isNotNull(payment.tinkoffPaymentId),
      isNotNull(payment.subscriptionId),
    ),
    orderBy: [asc(payment.createdAt)],
    limit: 30,
  });

  for (const row of rows) {
    const pid = row.tinkoffPaymentId;
    const sid = row.subscriptionId;
    if (!pid || !sid) continue;

    try {
      let st = await paymentClient.status(pid);
      if (st.status === "AUTHORIZED") {
        const confirmed = await paymentClient.confirm(pid);
        if (!confirmed) {
          logger.warn(
            { paymentId: pid, orderId: row.orderId },
            "reconcile: Confirm не прошёл, ожидаем следующий тик",
          );
          continue;
        }
        st = await paymentClient.status(pid);
      }

      if (st.status === "CONFIRMED") {
        await db
          .update(payment)
          .set({ status: "succeeded" })
          .where(eq(payment.id, row.id));

        const sub = await db.query.subscription.findFirst({
          where: eq(subscription.id, sid),
        });
        if (!sub) continue;

        if (sub.status === "pending_payment") {
          await db
            .update(subscription)
            .set({
              status: "active",
              autoRenew: true,
              ...(st.rebillId && st.rebillId !== ""
                ? { rebillId: st.rebillId }
                : {}),
              tinkoffCustomerKey: sub.userId,
              currentPeriodEnd: addSubscriptionPeriodEnd(now),
              cancelAtPeriodEnd: false,
              updatedAt: now,
            })
            .where(eq(subscription.id, sub.id));
        } else if (sub.autoRenew) {
          const nextEnd = addSubscriptionPeriodEnd(sub.currentPeriodEnd ?? now);
          await db
            .update(subscription)
            .set({
              status: "active",
              currentPeriodEnd: nextEnd,
              updatedAt: now,
            })
            .where(eq(subscription.id, sub.id));
        } else {
          logger.warn(
            { subscriptionId: sub.id, orderId: row.orderId },
            "reconcile: CONFIRMED subscription payment but autoRenew false — period not extended",
          );
        }

        await db
          .update(user)
          .set({
            serversQuantity:
              PLANS[sub.plan as PlanName].features.availableServer,
          })
          .where(eq(user.id, sub.userId));

        logger.info(
          { paymentId: pid, orderId: row.orderId },
          "reconcile: pending subscription payment -> succeeded",
        );
        continue;
      }

      if (st.status === "REJECTED" || st.status === "CANCELED") {
        await db
          .update(payment)
          .set({ status: "failed" })
          .where(eq(payment.id, row.id));

        const sub = await db.query.subscription.findFirst({
          where: eq(subscription.id, sid),
        });
        if (sub && (sub.plan === "pro" || sub.plan === "agency")) {
          await db
            .update(user)
            .set({ serversQuantity: PLANS.free.features.availableServer })
            .where(eq(user.id, sub.userId));
          if (sub.status === "pending_payment") {
            await db
              .update(subscription)
              .set({
                plan: "free",
                status: "active",
                autoRenew: true,
                updatedAt: now,
              })
              .where(eq(subscription.id, sub.id));
          } else {
            await db
              .update(subscription)
              .set({ status: "past_due", updatedAt: now })
              .where(eq(subscription.id, sub.id));
          }
        }

        logger.warn(
          { paymentId: pid, tinkoffStatus: st.status },
          "reconcile: pending subscription payment -> failed",
        );
      }
    } catch (err) {
      logger.warn(
        { paymentId: pid, err },
        "reconcile: ошибка GetState/Confirm",
      );
    }
  }
};

/**
 * После currentPeriodEnd: разовый доступ (autoRenew false) или отмена в конце периода
 * (cancelAtPeriodEnd true — в т.ч. старые строки с autoRenew true до фикса мутации).
 * Включаем past_due: после отказа банка статус меняется на past_due, но отмена/без автопродления
 * всё равно должны вернуть план на free, когда период истёк (иначе остаётся pro/agency в БД).
 */
export const expireNonAutoRenewSubscriptions = async (now: Date) => {
  const rows = await db.query.subscription.findMany({
    where: and(
      inArray(subscription.plan, PAID_PLANS),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "past_due"),
      ),
      isNotNull(subscription.currentPeriodEnd),
      lte(subscription.currentPeriodEnd, now),
      or(
        eq(subscription.autoRenew, false),
        eq(subscription.cancelAtPeriodEnd, true),
      ),
    ),
  });

  for (const sub of rows) {
    await db
      .update(user)
      .set({ serversQuantity: PLANS.free.features.availableServer })
      .where(eq(user.id, sub.userId));

    await db
      .update(subscription)
      .set({
        plan: "free",
        status: "active",
        rebillId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        autoRenew: true,
        updatedAt: now,
      })
      .where(eq(subscription.id, sub.id));

    logger.info(
      { subscriptionId: sub.id, userId: sub.userId },
      "charge-subscriptions: paid period ended (no renewal / cancel at period end), reset to free",
    );
  }
};
