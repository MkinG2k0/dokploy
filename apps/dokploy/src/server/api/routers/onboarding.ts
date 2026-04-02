import {
	advanceAezaOnboardingProvision,
	ensureOnboardingTestServer,
	excludeOnboardingTestServer,
	findUserById,
	IS_CLOUD,
	startAezaOnboardingProvision,
} from "@dokploy/server";
import { db } from "@dokploy/server/db";
import {
	server,
	subscription as subscriptionTable,
	user as userTable,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

const aezaTariffSchema = z.enum(["msks-1", "msks-2", "msks-3"]);

import {
	createTRPCRouter,
	protectedProcedure,
	withPermission,
} from "@/server/api/trpc";

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
		return {
			completed: row.onboardingCompleted,
			step: row.onboardingStep,
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

	createTestServer: withPermission("server", "create").mutation(
		async ({ ctx }) => {
			try {
				return await ensureOnboardingTestServer({
					organizationId: ctx.session.activeOrganizationId,
					ownerId: ctx.user.ownerId,
				});
			} catch (e) {
				if (e instanceof TRPCError) throw e;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Failed to create test server",
					cause: e,
				});
			}
		},
	),

	createAezaServer: protectedProcedure
		.input(z.object({ tariff: aezaTariffSchema }))
		.mutation(async ({ ctx, input }) => {
			try {
				const result = await startAezaOnboardingProvision({
					organizationId: ctx.session.activeOrganizationId,
					createdByUserId: ctx.user.id,
					tariff: input.tariff,
				});
				return { serverId: result.provisionId };
			} catch (e) {
				if (e instanceof TRPCError) throw e;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Failed to start Aeza server provisioning",
					cause: e,
				});
			}
		}),

	getServerStatus: protectedProcedure
		.input(z.object({ serverId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			try {
				const out = await advanceAezaOnboardingProvision({
					provisionId: input.serverId,
					organizationId: ctx.session.activeOrganizationId,
				});
				return {
					status: out.status,
					dokployServerId: out.dokployServerId,
					message: out.message,
				};
			} catch (e) {
				if (e instanceof TRPCError) throw e;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Failed to get server status",
					cause: e,
				});
			}
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
				.where(
					and(
						eq(server.organizationId, ctx.session.activeOrganizationId),
						excludeOnboardingTestServer(),
					),
				);

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
