import { RecurrenceRule, scheduleJob } from "node-schedule";

import { createId } from "@paralleldrive/cuid2";
import { logger } from "../lib/logger";
import { db, user } from "../db";
import { payment as paymentClient } from "../billing/payment";
import { kopekToRub } from "../billing/money";
import { PLANS, getEffectivePlanPrices } from "../billing/plans";
import {
  addSubscriptionPeriodEnd,
  isSubscriptionPeriodTestMode,
} from "../billing/subscription-period";
import { payment, subscription } from "../db/schema/billing";
import { eq } from "drizzle-orm";

import {
  expireNonAutoRenewSubscriptions,
  loadSubscriptionsEligibleForRebill,
} from "./charge-subscriptions-helpers";

const runChargeSubscriptionsJob = async () => {
  const now = new Date();

  const dueSubscriptions = await loadSubscriptionsEligibleForRebill(now);

  for (const sub of dueSubscriptions) {
    const { price } = getEffectivePlanPrices(sub.plan);

    const orderId = createId();

    try {
      const result = await paymentClient.charge({
        userId: sub.userId,
        amount: kopekToRub(price),
        description: `DeployBox ${sub.plan}`,
        rebillId: sub.rebillId ?? "",
      });

      if (result.success) {
        await db.insert(payment).values({
          userId: sub.userId,
          subscriptionId: sub.id,
          tinkoffPaymentId: result.paymentId,
          orderId,
          amount: price,
          currency: "RUB",
          type: "subscription",
          status: "succeeded",
          description: `DeployBox ${sub.plan}`,
        });

        const nextEnd = addSubscriptionPeriodEnd(sub.currentPeriodEnd ?? now);
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
        amount: price,
        currency: "RUB",
        type: "subscription",
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

  await expireNonAutoRenewSubscriptions(now);
};

export const initChargeSubscriptionsCronJobs = async () => {
  if (isSubscriptionPeriodTestMode()) {
    logger.warn(
      "BILLING_SUBSCRIPTION_PERIOD_TEST: subscription period 1 minute, charge-subscriptions every minute",
    );
    scheduleJob("charge-subscriptions", "* * * * *", runChargeSubscriptionsJob);
    return;
  }

  const rule = new RecurrenceRule();
  rule.tz = "Etc/UTC";
  rule.hour = 10;
  rule.minute = 0;

  scheduleJob("charge-subscriptions", rule, runChargeSubscriptionsJob);
};
