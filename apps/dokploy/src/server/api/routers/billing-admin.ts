import { db } from "@dokploy/server/db";
import {
  subscription as subscriptionTable,
  user as userTable,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isSuperAdmin } from "@/server/api/utils/audit";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const upsertUserSubscriptionInput = z.object({
  targetUserId: z.string().min(1),
  plan: z.enum(["free", "pro", "agency"]),
  status: z.enum(["active", "inactive"]),
  currentPeriodEnd: z.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  autoRenew: z.boolean(),
});

export const billingAdminRouter = createTRPCRouter({
  upsertUserSubscription: protectedProcedure
    .input(upsertUserSubscriptionInput)
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.user)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin only",
        });
      }

      const target = await db.query.user.findFirst({
        where: eq(userTable.id, input.targetUserId),
        columns: { id: true },
      });

      if (!target) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const existing = await db.query.subscription.findFirst({
        where: eq(subscriptionTable.userId, input.targetUserId),
      });

      const now = new Date();
      const isNew = !existing;
      const autoRenew = isNew ? false : input.autoRenew;

      const payload = {
        plan: input.plan,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        autoRenew,
        updatedAt: now,
      };

      if (isNew) {
        await db.insert(subscriptionTable).values({
          userId: input.targetUserId,
          ...payload,
          createdAt: now,
        });
      } else {
        await db
          .update(subscriptionTable)
          .set(payload)
          .where(eq(subscriptionTable.userId, input.targetUserId));
      }

      return { ok: true as const, created: isNew };
    }),
});
