import { addSubscriptionPeriodEnd } from "@dokploy/server/billing/subscription-period";
import { kopekToRub } from "@dokploy/server/billing/money";
import {
  PLANS,
  getEffectivePlanPrices,
  getPlansForDisplay,
  type PlanKey,
} from "@dokploy/server/billing/plans";
import { payment } from "@dokploy/server/billing/payment";
import { db } from "@dokploy/server/db";
import {
  payment as paymentTable,
  subscription as subscriptionTable,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const billingRouter = createTRPCRouter({
  getPlans: protectedProcedure.query(() => {
    return getPlansForDisplay();
  }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const row = await db.query.subscription.findFirst({
      where: eq(subscriptionTable.userId, ctx.user.ownerId),
    });

    return row ?? null;
  }),

  getPayments: protectedProcedure.query(async ({ ctx }) => {
    return await db.query.payment.findMany({
      where: eq(paymentTable.userId, ctx.user.ownerId),
      orderBy: desc(paymentTable.createdAt),
      limit: 50,
    });
  }),

  clearPaymentHistory: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .delete(paymentTable)
      .where(eq(paymentTable.userId, ctx.user.ownerId));
    return { ok: true as const };
  }),

  createCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["free", "pro", "agency"]),
        billingType: z.enum(["one_time", "recurring"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const planKey: PlanKey = input.plan;
      const plan = PLANS[planKey];

      if (!plan) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
      }

      if (planKey === "free") {
        return { paymentUrl: "" };
      }

      if (input.billingType === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "billingType is required for paid plans",
        });
      }

      const isRecurring = input.billingType === "recurring";
      const paymentRowType = isRecurring ? "subscription" : "one_time";

      const { price } = getEffectivePlanPrices(planKey);

      const orderId = createId();

      const description = isRecurring
        ? `DeployBox ${plan.name} — автопродление`
        : `DeployBox ${plan.name} — разовый платёж`;

      const { paymentUrl, paymentId } = await payment.init({
        amount: price,
        orderId,
        description,
        userId: ctx.user.ownerId,
        recurrent: isRecurring,
      });

      const now = new Date();
      const [subscriptionRow] = await db
        .insert(subscriptionTable)
        .values({
          userId: ctx.user.ownerId,
          plan: planKey,
          status: "pending_payment",
          cancelAtPeriodEnd: false,
          autoRenew: isRecurring,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: subscriptionTable.userId,
          set: {
            plan: planKey,
            status: "pending_payment",
            cancelAtPeriodEnd: false,
            autoRenew: isRecurring,
            updatedAt: now,
          },
        })
        .returning({ id: subscriptionTable.id });

      if (!subscriptionRow) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create subscription for checkout",
        });
      }

      await db.insert(paymentTable).values({
        userId: ctx.user.ownerId,
        subscriptionId: subscriptionRow.id,
        tinkoffPaymentId: paymentId,
        orderId,
        amount: price,
        currency: "RUB",
        type: paymentRowType,
        metadata: { billingType: input.billingType },
        status: "pending",
        description,
      });

      return { paymentUrl };
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await db.query.subscription.findFirst({
      where: eq(subscriptionTable.userId, ctx.user.ownerId),
    });

    if (!existing) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscription not found",
      });
    }

    const isPaidPlan = existing.plan === "pro" || existing.plan === "agency";
    if (!isPaidPlan || existing.status !== "active") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active paid subscription to cancel",
      });
    }

    if (existing.cancelAtPeriodEnd && !existing.autoRenew) {
      return { ok: true as const };
    }

    const now = new Date();
    await db
      .update(subscriptionTable)
      .set({
        cancelAtPeriodEnd: true,
        autoRenew: false,
        updatedAt: now,
      })
      .where(eq(subscriptionTable.userId, ctx.user.ownerId));

    return { ok: true as const };
  }),

  /** Временно: полное удаление строки подписки из БД (для отладки / сброса состояния). */
  deleteSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await db.query.subscription.findFirst({
      where: eq(subscriptionTable.userId, ctx.user.ownerId),
    });

    if (!existing) {
      return { ok: true as const, deleted: false as const };
    }

    await db
      .delete(subscriptionTable)
      .where(eq(subscriptionTable.userId, ctx.user.ownerId));

    return { ok: true as const, deleted: true as const };
  }),
});
