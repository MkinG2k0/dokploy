import { findUserById, IS_CLOUD } from "@dokploy/server";
import { db } from "@dokploy/server/db";
import {
	projects,
	server,
	subscription as subscriptionTable,
	user as userTable,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const hasPaidEntitlement = (
	sub:
		| {
				plan: string;
				status: string;
		  }
		| null
		| undefined,
): boolean =>
	Boolean(
		sub &&
			(sub.plan === "pro" || sub.plan === "agency") &&
			(sub.status === "active" || sub.status === "past_due"),
	);

export const onboardingRouter = createTRPCRouter({
	getStatus: protectedProcedure.query(async ({ ctx }) => {
		const row = await db.query.user.findFirst({
			where: eq(userTable.id, ctx.user.id),
			columns: {
				onboardingCompleted: true,
				onboardingStep: true,
			},
		});
		if (!row) {
			throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
		}
		const bootstrapProject = await db.query.projects.findFirst({
			where: and(
				eq(projects.name, "First Project"),
				eq(projects.organizationId, ctx.session.activeOrganizationId),
			),
			columns: { projectId: true },
		});
		return {
			completed: row.onboardingCompleted,
			step: row.onboardingStep,
			bootstrapProjectId: bootstrapProject?.projectId ?? null,
		};
	}),

	saveProgress: protectedProcedure
		.input(z.object({ step: z.number().int().min(1).max(4) }))
		.mutation(async ({ ctx, input }) => {
			const row = await db.query.user.findFirst({
				where: eq(userTable.id, ctx.user.id),
				columns: { onboardingCompleted: true },
			});
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
			}
			if (row.onboardingCompleted) {
				return { ok: true as const, skipped: true as const };
			}
			await db
				.update(userTable)
				.set({ onboardingStep: input.step })
				.where(eq(userTable.id, ctx.user.id));
			return { ok: true as const, skipped: false as const };
		}),

	complete: protectedProcedure.mutation(async ({ ctx }) => {
		await db
			.update(userTable)
			.set({
				onboardingCompleted: true,
				onboardingStep: null,
			})
			.where(eq(userTable.id, ctx.user.id));
		return { ok: true as const };
	}),

	getContext: protectedProcedure.query(async ({ ctx }) => {
		const sub = await db.query.subscription.findFirst({
			where: eq(subscriptionTable.userId, ctx.user.ownerId),
		});

		const hasPaidSubscription = hasPaidEntitlement(sub);

		let serverLimit: number | null = null;
		let currentServerCount = 0;

		if (IS_CLOUD) {
			const owner = await findUserById(ctx.user.ownerId);
			serverLimit = owner.serversQuantity;

			const [agg] = await db
				.select({ value: count() })
				.from(server)
				.where(eq(server.organizationId, ctx.session.activeOrganizationId));

			currentServerCount = Number(agg?.value ?? 0);
		}

		return {
			hasPaidSubscription,
			serverLimit,
			currentServerCount,
			isCloud: IS_CLOUD,
		};
	}),
});
