import { TRPCError } from "@trpc/server";
import { and, count, eq, inArray } from "drizzle-orm";

import { IS_CLOUD, ONBOARDING_TEST_SERVER_NAME } from "../constants";
import { db } from "../db";
import { organization, server } from "../db/schema";
import { findUserById } from "./admin";
import { excludeOnboardingTestServer } from "./onboarding-test-server-conditions";
import { syncPlanAccessBlockedForOwner } from "./plan-server-access";

export { ONBOARDING_TEST_SERVER_NAME } from "../constants";

const PLACEHOLDER_IP = "127.0.0.1";
const PLACEHOLDER_PORT = 22;

/**
 * Идемпотентно: при наличии сервера с именем «Тестовый сервер» в организации возвращает его,
 * иначе создаёт запись без реального SSH (`provisionSource` manual, фиксированное имя). В cloud не расходует слот лимита.
 */
export const ensureOnboardingTestServer = async (params: {
	organizationId: string;
	ownerId: string;
}): Promise<{ serverId: string; created: boolean }> => {
	const { organizationId, ownerId } = params;

	const orgRow = await db.query.organization.findFirst({
		where: eq(organization.id, organizationId),
		columns: { id: true },
	});
	if (!orgRow) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Organization not found",
		});
	}

	const existing = await db.query.server.findFirst({
		where: and(
			eq(server.organizationId, organizationId),
			eq(server.name, ONBOARDING_TEST_SERVER_NAME),
		),
	});
	if (existing) {
		return { serverId: existing.serverId, created: false };
	}

	if (IS_CLOUD) {
		const owner = await findUserById(ownerId);
		const orgs = await db.query.organization.findMany({
			where: eq(organization.ownerId, ownerId),
			columns: { id: true },
		});
		const orgIds = orgs.map((o) => o.id);
		if (orgIds.length === 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "No organization for owner",
			});
		}
		const [agg] = await db
			.select({ value: count() })
			.from(server)
			.where(
				and(
					inArray(server.organizationId, orgIds),
					excludeOnboardingTestServer(),
				),
			);
		const nonTest = Number(agg?.value ?? 0);
		if (nonTest >= owner.serversQuantity) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Достигнут лимит серверов: удалите сервер или смените тариф, затем снова создайте тестовый.",
			});
		}
	}

	const [inserted] = await db
		.insert(server)
		.values({
			name: ONBOARDING_TEST_SERVER_NAME,
			description: "DeployBox onboarding — no real SSH",
			ipAddress: PLACEHOLDER_IP,
			port: PLACEHOLDER_PORT,
			username: "root",
			sshKeyId: null,
			organizationId,
			createdAt: new Date().toISOString(),
			provisionSource: "manual",
		})
		.returning({ serverId: server.serverId });

	const createdRow = inserted;
	if (!createdRow) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Failed to create test server",
		});
	}

	if (IS_CLOUD) {
		await syncPlanAccessBlockedForOwner(ownerId);
	}

	return { serverId: createdRow.serverId, created: true };
};
