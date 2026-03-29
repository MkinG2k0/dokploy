import { logger } from "../lib/logger";
import { db, user } from "../db";
import { PLANS, type PlanName } from "../billing/plans";
import {
  isSubscriptionPeriodTestMode,
  pendingChargeCooldownSince,
  renewalHorizonFromNow,
} from "../billing/subscription-period";
import { payment, subscription } from "../db/schema/billing";
import { eq, and, gte, isNotNull, lte, or, inArray } from "drizzle-orm";

const PAID_PLANS = ["pro", "agency"] as const satisfies readonly PlanName[];

/**
 * Платный период уже закончился (как lte(currentPeriodEnd, renewalHorizon) для ребилла,
 * но отсчёт от now: конец периода в прошлом или сейчас).
 * Без автопродления / отмена в конце периода — то, что нужно сбросить на free.
 */
const wherePaidSubscriptionPeriodEndedWithoutRenewal = (now: Date) =>
  and(
    inArray(subscription.plan, PAID_PLANS),
    or(eq(subscription.status, "active"), eq(subscription.status, "past_due")),
    isNotNull(subscription.currentPeriodEnd),
    lte(subscription.currentPeriodEnd, now),
    or(
      eq(subscription.autoRenew, false),
      eq(subscription.cancelAtPeriodEnd, true),
    ),
  );

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
    logger.info("charge-subscriptions: no candidates");
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

  logger.info(`charge-subscriptions: candidates ${due.length} loaded`);

  return due;
};

/**
 * Платные подписки без продления: разовый период (autoRenew false) или отмена в конце периода
 * (cancelAtPeriodEnd true). Только active / past_due и с заданным currentPeriodEnd.
 */
export const loadSubscriptionsWithoutRenewal = async () => {
  return db.query.subscription.findMany({
    where: and(
      inArray(subscription.plan, PAID_PLANS),
      isNotNull(subscription.currentPeriodEnd),
      or(
        eq(subscription.autoRenew, false),
        eq(subscription.cancelAtPeriodEnd, true),
      ),
      or(
        eq(subscription.status, "active"),
        eq(subscription.status, "past_due"),
      ),
    ),
  });
};

/**
 * Платные подписки, у которых период уже истёк (currentPeriodEnd <= now), без продления.
 * Строку subscription не удаляем: на пользователя одна запись, иначе ломаются запросы подписки;
 * сброс на free делает {@link expireNonAutoRenewSubscriptions}.
 */
export const loadPaidSubscriptionsExpiredWithoutRenewal = async (now: Date) => {
  return db.query.subscription.findMany({
    where: wherePaidSubscriptionPeriodEndedWithoutRenewal(now),
  });
};

/**
 * После currentPeriodEnd: разовый доступ (autoRenew false) или отмена в конце периода
 * (cancelAtPeriodEnd true — в т.ч. старые строки с autoRenew true до фикса мутации).
 * Включаем past_due: после отказа банка статус меняется на past_due, но отмена/без автопродления
 * всё равно должны вернуть план на free, когда период истёк (иначе остаётся pro/agency в БД).
 */
export const expireNonAutoRenewSubscriptions = async (now: Date) => {
  const rows = await loadPaidSubscriptionsExpiredWithoutRenewal(now);

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
  }
};
