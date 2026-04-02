import { eq, inArray } from "drizzle-orm";

import { PLANS, type PlanKey } from "../billing/plans";
import { IS_CLOUD, ONBOARDING_TEST_SERVER_NAME } from "../constants";
import { db } from "../db";
import { organization, server, user } from "../db/schema";

const parseServerCreatedMs = (createdAt: string): number => {
	const t = Date.parse(createdAt);
	return Number.isNaN(t) ? 0 : t;
};

/**
 * Пересчёт planAccessBlocked: N самых новых серверов (createdAt DESC) — в лимите.
 * Только cloud; self-hosted — no-op.
 */
export const syncPlanAccessBlockedForOwner = async (
	ownerId: string,
): Promise<void> => {
	if (!IS_CLOUD) return;

	const ownerRow = await db.query.user.findFirst({
		where: eq(user.id, ownerId),
		columns: { serversQuantity: true },
	});
	const quantity =
		ownerRow?.serversQuantity ?? PLANS.free.features.availableServer;
	const safeQuantity = Math.max(0, quantity);

	const orgs = await db.query.organization.findMany({
		where: eq(organization.ownerId, ownerId),
		columns: { id: true },
	});
	const orgIds = orgs.map((o) => o.id);
	if (orgIds.length === 0) return;

	const servers = await db.query.server.findMany({
		where: inArray(server.organizationId, orgIds),
		columns: {
			serverId: true,
			name: true,
			createdAt: true,
			planAccessBlocked: true,
			provisionSource: true,
		},
	});

	const isOnboardingTestServerRow = (s: {
		name: string;
		provisionSource: string;
	}) => s.provisionSource === "test" || s.name === ONBOARDING_TEST_SERVER_NAME;

	const testServers = servers.filter(isOnboardingTestServerRow);
	const realServers = servers.filter((s) => !isOnboardingTestServerRow(s));

	const sorted = [...realServers].sort(
		(a, b) =>
			parseServerCreatedMs(b.createdAt) - parseServerCreatedMs(a.createdAt),
	);

	const allowedIds = new Set(
		sorted.slice(0, safeQuantity).map((s) => s.serverId),
	);

	for (const s of sorted) {
		const blocked = !allowedIds.has(s.serverId);
		if (s.planAccessBlocked !== blocked) {
			await db
				.update(server)
				.set({ planAccessBlocked: blocked })
				.where(eq(server.serverId, s.serverId));
		}
	}

	for (const s of testServers) {
		if (s.planAccessBlocked !== false) {
			await db
				.update(server)
				.set({ planAccessBlocked: false })
				.where(eq(server.serverId, s.serverId));
		}
	}
};

export const setOwnerServersQuantityAndSyncPlanAccess = async (
	ownerId: string,
	quantity: number,
): Promise<void> => {
	const safe = Math.max(0, Math.floor(quantity));
	await db
		.update(user)
		.set({ serversQuantity: safe })
		.where(eq(user.id, ownerId));
	await syncPlanAccessBlockedForOwner(ownerId);
};

export const resetOwnerServersQuantityToFree = async (
	ownerId: string,
): Promise<void> => {
	await setOwnerServersQuantityAndSyncPlanAccess(
		ownerId,
		PLANS.free.features.availableServer,
	);
};

export const setOwnerServersQuantityByPlanKey = async (
	ownerId: string,
	planKey: PlanKey,
): Promise<void> => {
	await setOwnerServersQuantityAndSyncPlanAccess(
		ownerId,
		PLANS[planKey].features.availableServer,
	);
};
