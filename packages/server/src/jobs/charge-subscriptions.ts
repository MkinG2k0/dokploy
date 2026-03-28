import { RecurrenceRule, scheduleJob } from "node-schedule";

import { addDays, addHours, subHours } from "date-fns";
import { createId } from "@paralleldrive/cuid2";
import { logger } from "../lib/logger";
import { db, user } from "../db";
import { payment as paymentClient } from "../billing/payment";
import { PLANS, type PlanName } from "../billing/plans";
import { payment, subscription } from "../db/schema/billing";
import { eq, and, desc, gte, isNotNull, lte, or, inArray } from "drizzle-orm";

const PERIOD_DAYS = 30;
/** Попытка рекуррента не раньше чем за столько часов до currentPeriodEnd (и дальше по расписанию, пока период не продлён). */
const RENEWAL_LEAD_HOURS = 24;
/** Не дублировать Charge, пока по подписке есть «свежий» pending (UNKNOWN); после окна — повторная попытка. */
const PENDING_CHARGE_COOLDOWN_HOURS = 24;

const PAID_PLANS = ["pro", "agency"] as const satisfies readonly PlanName[];

const toRub = (amountKopek: number): number => amountKopek / 100;

type SubscriptionPlan = (typeof subscription.$inferSelect)["plan"];

const catalogPriceKopekOrNull = (plan: SubscriptionPlan): number | null => {
  const price = PLANS[plan as PlanName].price;
  return price > 0 ? price : null;
};

/** Сумма рекуррента: последний успешный платёж по подписке в БД, иначе цена плана из каталога. */
const resolveRebillAmountKopek = async (
  subscriptionId: string,
  plan: SubscriptionPlan,
): Promise<number | null> => {
  const lastSucceeded = await db.query.payment.findFirst({
    where: and(
      eq(payment.subscriptionId, subscriptionId),
      eq(payment.status, "succeeded"),
      eq(payment.type, "subscription"),
    ),
    orderBy: [desc(payment.createdAt)],
  });

  if (lastSucceeded && lastSucceeded.amount > 0) {
    return lastSucceeded.amount;
  }

  return catalogPriceKopekOrNull(plan);
};

/**
 * Подписки, по которым можно вызывать рекуррент:
 * - только платные планы;
 * - есть RebillId, не отменена в конце периода;
 * - active: окно продления (до RENEWAL_LEAD_HOURS до currentPeriodEnd и позже);
 * - past_due: повтор после отказа банка (тот же крон, раз в сутки).
 * Без дубля Charge, если по подписке уже есть pending моложе PENDING_CHARGE_COOLDOWN_HOURS.
 */
const loadSubscriptionsEligibleForRebill = async (now: Date) => {
  const renewalHorizon = addHours(now, RENEWAL_LEAD_HOURS);
  const pendingCooldownSince = subHours(now, PENDING_CHARGE_COOLDOWN_HOURS);

  const candidates = await db.query.subscription.findMany({
    where: and(
      inArray(subscription.plan, PAID_PLANS),
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

  return candidates.filter((s) => !pendingSubscriptionIds.has(s.id));
};

export const initChargeSubscriptionsCronJobs = async () => {
  const rule = new RecurrenceRule();
  rule.tz = "Etc/UTC";
  rule.hour = 10;
  rule.minute = 0;

  scheduleJob("charge-subscriptions", rule, async () => {
    const now = new Date();

    const dueSubscriptions = await loadSubscriptionsEligibleForRebill(now);

    for (const sub of dueSubscriptions) {
      const amountKopek = await resolveRebillAmountKopek(sub.id, sub.plan);
      if (!amountKopek) {
        logger.warn(
          { subscriptionId: sub.id, plan: sub.plan },
          "No rebill amount (catalog and payment history empty)",
        );
        continue;
      }

      const orderId = createId();
      try {
        const result = await paymentClient.charge({
          userId: sub.userId,
          amount: toRub(amountKopek),
          description: `DeployBox ${sub.plan}`,
          rebillId: sub.rebillId ?? "",
        });

        if (result.success) {
          await db.insert(payment).values({
            userId: sub.userId,
            subscriptionId: sub.id,
            tinkoffPaymentId: result.paymentId,
            orderId,
            amount: amountKopek,
            currency: "RUB",
            status: "succeeded",
            description: `DeployBox ${sub.plan}`,
          });

          const nextEnd = addDays(sub.currentPeriodEnd ?? now, PERIOD_DAYS);
          await db
            .update(subscription)
            .set({
              status: "active",
              currentPeriodEnd: nextEnd,
              updatedAt: now,
            })
            .where(eq(subscription.id, sub.id));

          continue;
        }
        // Если платеж неуспешен, cбрасываем подписке availableServer в дефолтное значение
        await db
          .update(user)
          .set({ serversQuantity: PLANS.free.features.availableServer })
          .where(eq(user.id, sub.userId));

        await db.insert(payment).values({
          userId: sub.userId,
          subscriptionId: sub.id,
          tinkoffPaymentId: result.paymentId,
          orderId,
          amount: amountKopek,
          currency: "RUB",
          status: result.failureKind === "REJECTED" ? "failed" : "pending",
          description: `DeployBox ${sub.plan}`,
        });

        if (result.failureKind === "REJECTED") {
          await db
            .update(subscription)
            .set({ status: "past_due", updatedAt: now })
            .where(eq(subscription.id, sub.id));

          logger.warn(
            { subscriptionId: sub.id, userId: sub.userId },
            "Subscription moved to past_due",
          );

          continue;
        }

        logger.warn(
          { subscriptionId: sub.id, userId: sub.userId },
          "Temporary charge failure (pending in DB); retry after cooldown or sync status",
        );
      } catch (error) {
        logger.error(
          { subscriptionId: sub.id, error },
          "Charge subscriptions job failed",
        );
      }
    }
  });
};
