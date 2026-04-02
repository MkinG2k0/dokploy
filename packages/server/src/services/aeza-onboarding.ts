import { db } from "@dokploy/server/db";
import {
	aezaOnboardingProvision,
	organization,
	server,
	sshKeys,
	subscription as subscriptionTable,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { IS_CLOUD, ONBOARDING_TEST_SERVER_NAME } from "../constants";
import { generateSSHKey } from "../utils/filesystem/ssh";
import { findUserById } from "./admin";
import { syncPlanAccessBlockedForOwner } from "./plan-server-access";
import { createServer, findServersByUserId } from "./server";

const AEZA_API_BASE_DEFAULT = "https://core.aeza.net/api";
const FETCH_TIMEOUT_MS = 15_000;

export const AEZA_ONBOARDING_TARIFFS = ["msks-1", "msks-2", "msks-3"] as const;
export type AezaOnboardingTariff = (typeof AEZA_ONBOARDING_TARIFFS)[number];

const hasPaidEntitlement = (
	sub: { plan: string; status: string } | null | undefined,
): boolean =>
	Boolean(
		sub &&
			(sub.plan === "pro" || sub.plan === "agency") &&
			(sub.status === "active" || sub.status === "past_due"),
	);

const aezaApiBase = (): string => {
	const raw = process.env.AEZA_API_BASE_URL?.trim();
	return raw && raw.length > 0 ? raw.replace(/\/$/, "") : AEZA_API_BASE_DEFAULT;
};

const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000;
let productsListCache: { expiresAt: number; items: unknown[] } | null = null;

function readProductItemNumericId(
	item: Record<string, unknown>,
): number | null {
	const raw = item.id ?? item.productId ?? item.product_id;
	if (typeof raw === "number" && Number.isFinite(raw)) return raw;
	if (typeof raw === "string") {
		const n = Number(raw);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function readProductItemName(item: Record<string, unknown>): string | null {
	const n = item.name;
	return typeof n === "string" && n.trim().length > 0 ? n.trim() : null;
}

/** Сопоставление slug тарифа визарда с полем name из /services/products. */
function tariffMatchesProductName(
	tariff: AezaOnboardingTariff,
	productName: string,
): boolean {
	const compact = productName.toLowerCase().replace(/\s+/g, "");
	const tier = tariff === "msks-1" ? "1" : tariff === "msks-2" ? "2" : "3";
	if (compact.includes(`msks-${tier}`)) return true;
	if (compact.includes(`msks${tier}`)) return true;
	return new RegExp(`msks[^a-z0-9]*${tier}\\b`, "i").test(productName);
}

function pickProductIdFromCatalog(
	items: unknown[],
	tariff: AezaOnboardingTariff,
): number | null {
	for (const it of items) {
		if (!it || typeof it !== "object") continue;
		const o = it as Record<string, unknown>;
		const name = readProductItemName(o);
		if (!name || !tariffMatchesProductName(tariff, name)) continue;
		const id = readProductItemNumericId(o);
		if (id !== null) return id;
	}
	return null;
}

async function fetchAezaProductCatalog(
	token: string,
	base: string,
): Promise<unknown[]> {
	if (productsListCache && Date.now() < productsListCache.expiresAt) {
		return productsListCache.items;
	}
	const url = `${base}/services/products?offset=0&count=500`;
	const res = await fetchJson(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) {
		return [];
	}
	const items = extractItems(res.json);
	productsListCache = {
		expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
		items,
	};
	return items;
}

async function resolveProductIdForTariff(
	tariff: AezaOnboardingTariff,
	token: string,
): Promise<number | null> {
	const base = aezaApiBase();
	const items = await fetchAezaProductCatalog(token, base);
	return pickProductIdFromCatalog(items, tariff);
}

const osParameterId = (): number => {
	const v = process.env.AEZA_OS_PARAMETER_ID?.trim() ?? "25";
	const n = Number(v);
	return Number.isFinite(n) ? n : 25;
};

const orderTerm = (): string => process.env.AEZA_ORDER_TERM?.trim() || "month";

const orderMethod = (): string =>
	process.env.AEZA_ORDER_METHOD?.trim() || "balance";

async function fetchJson(
	url: string,
	init: RequestInit,
): Promise<{ ok: boolean; status: number; json: unknown }> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { ...init, signal: ctrl.signal });
		const json = (await res.json().catch(() => null)) as unknown;
		return { ok: res.ok, status: res.status, json };
	} finally {
		clearTimeout(t);
	}
}

function readAezaError(json: unknown): string | null {
	if (!json || typeof json !== "object") return null;
	const o = json as Record<string, unknown>;
	const err = o.error;
	if (!err || typeof err !== "object") return null;
	const e = err as Record<string, unknown>;
	const msg = e.message;
	return typeof msg === "string" ? msg : null;
}

function extractItems(json: unknown): unknown[] {
	if (!json || typeof json !== "object") return [];
	const o = json as Record<string, unknown>;
	const data = o.data;
	if (!data || typeof data !== "object") return [];
	const d = data as Record<string, unknown>;
	const items = d.items;
	return Array.isArray(items) ? items : [];
}

function pickServiceByName(
	items: unknown[],
	name: string,
): Record<string, unknown> | null {
	for (const it of items) {
		if (!it || typeof it !== "object") continue;
		const o = it as Record<string, unknown>;
		if (o.name === name) return o;
	}
	return null;
}

function readIp(item: Record<string, unknown>): string | null {
	const ip = item.ip;
	if (typeof ip === "string" && ip.trim().length > 0) return ip.trim();
	return null;
}

function readStatus(item: Record<string, unknown>): string | null {
	const s = item.status;
	return typeof s === "string" ? s : null;
}

function readId(item: Record<string, unknown>): string | null {
	const id = item.id;
	if (typeof id === "number") return String(id);
	if (typeof id === "string") return id;
	return null;
}

async function countAezaServersInOrg(organizationId: string): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(server)
		.where(
			and(
				eq(server.organizationId, organizationId),
				eq(server.provisionSource, "aeza"),
			),
		);
	return Number(row?.value ?? 0);
}

async function countProvisioningAezaForOrg(
	organizationId: string,
): Promise<number> {
	const [row] = await db
		.select({ value: count() })
		.from(aezaOnboardingProvision)
		.where(
			and(
				eq(aezaOnboardingProvision.organizationId, organizationId),
				eq(aezaOnboardingProvision.status, "provisioning"),
			),
		);
	return Number(row?.value ?? 0);
}

export async function assertCanCreateAezaOnboardingProvision(params: {
	organizationId: string;
	ownerUserId: string;
}): Promise<void> {
	if (!IS_CLOUD) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Aeza onboarding is only available in cloud mode",
		});
	}
	const sub = await db.query.subscription.findFirst({
		where: eq(subscriptionTable.userId, params.ownerUserId),
	});
	const paid = hasPaidEntitlement(sub);
	if (paid) return;
	const servers = await countAezaServersInOrg(params.organizationId);
	const pending = await countProvisioningAezaForOrg(params.organizationId);
	if (servers + pending >= 1) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Free plan allows only one Aeza server. Upgrade or use your own VPS.",
		});
	}
}

export async function startAezaOnboardingProvision(params: {
	organizationId: string;
	createdByUserId: string;
	tariff: AezaOnboardingTariff;
}): Promise<{ provisionId: string }> {
	await assertCanCreateAezaOnboardingProvision({
		organizationId: params.organizationId,
		ownerUserId: params.createdByUserId,
	});
	const token = process.env.AEZA_API_TOKEN?.trim();
	if (!token) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "AEZA_API_TOKEN is not configured on the server.",
		});
	}
	const now = new Date().toISOString();
	const serviceName = `deploybox-${nanoid(10)}`;
	const [row] = await db
		.insert(aezaOnboardingProvision)
		.values({
			organizationId: params.organizationId,
			createdByUserId: params.createdByUserId,
			tariff: params.tariff,
			serviceName,
			status: "provisioning",
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!row) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create Aeza provision record",
		});
	}

	return { provisionId: row.id };
}

export type AezaProvisionStatusResult = {
	status: "provisioning" | "active" | "error";
	dokployServerId: string | null;
	message: string | null;
};

export async function advanceAezaOnboardingProvision(params: {
	provisionId: string;
	organizationId: string;
}): Promise<AezaProvisionStatusResult> {
	const row = await db.query.aezaOnboardingProvision.findFirst({
		where: eq(aezaOnboardingProvision.id, params.provisionId),
	});
	if (!row || row.organizationId !== params.organizationId) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Provision not found" });
	}

	if (row.status === "active" && row.dokployServerId) {
		return {
			status: "active",
			dokployServerId: row.dokployServerId,
			message: null,
		};
	}
	if (row.status === "error") {
		return {
			status: "error",
			dokployServerId: null,
			message: row.errorMessage ?? "Unknown error",
		};
	}

	const token = process.env.AEZA_API_TOKEN?.trim();
	if (!token) {
		await db
			.update(aezaOnboardingProvision)
			.set({
				status: "error",
				errorMessage: "AEZA_API_TOKEN is not configured",
				updatedAt: new Date().toISOString(),
			})
			.where(eq(aezaOnboardingProvision.id, row.id));
		return {
			status: "error",
			dokployServerId: null,
			message: "AEZA_API_TOKEN is not configured",
		};
	}

	const base = aezaApiBase();
	const now = () => new Date().toISOString();

	const markError = async (msg: string) => {
		await db
			.update(aezaOnboardingProvision)
			.set({
				status: "error",
				errorMessage: msg,
				updatedAt: now(),
			})
			.where(eq(aezaOnboardingProvision.id, row.id));
	};

	if (!row.sshKeyId) {
		try {
			const keys = await generateSSHKey("ed25519");
			const [keyRow] = await db
				.insert(sshKeys)
				.values({
					name: `Aeza ${row.serviceName}`,
					publicKey: keys.publicKey,
					privateKey: keys.privateKey,
					organizationId: row.organizationId,
				})
				.returning();
			if (!keyRow) {
				await markError("Failed to store SSH key");
				return {
					status: "error",
					dokployServerId: null,
					message: "Failed to store SSH key",
				};
			}
			await db
				.update(aezaOnboardingProvision)
				.set({ sshKeyId: keyRow.sshKeyId, updatedAt: now() })
				.where(eq(aezaOnboardingProvision.id, row.id));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "SSH key error";
			await markError(msg);
			return { status: "error", dokployServerId: null, message: msg };
		}
	}

	const fresh = await db.query.aezaOnboardingProvision.findFirst({
		where: eq(aezaOnboardingProvision.id, params.provisionId),
	});
	if (!fresh || fresh.status !== "provisioning") {
		return advanceAezaOnboardingProvision(params);
	}

	if (!fresh.orderPlacedAt) {
		const productId = await resolveProductIdForTariff(
			fresh.tariff as AezaOnboardingTariff,
			token,
		);
		if (productId === null) {
			const hint = `No Aeza product matched tariff "${fresh.tariff}" in GET /services/products (check product names vs MSKs-1/2/3).`;
			await markError(hint);
			return {
				status: "error",
				dokployServerId: null,
				message: hint,
			};
		}
		const orderUrl = `${base}/services/orders`;
		const body = {
			count: 1,
			term: orderTerm(),
			name: fresh.serviceName,
			productId,
			parameters: { os: osParameterId() },
			autoProlong: false,
			method: orderMethod(),
		};
		const res = await fetchJson(orderUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
		const errMsg = readAezaError(res.json);
		if (!res.ok || errMsg) {
			const msg = errMsg || `Aeza order failed (${res.status})`;
			await markError(msg);
			return { status: "error", dokployServerId: null, message: msg };
		}
		await db
			.update(aezaOnboardingProvision)
			.set({
				orderPlacedAt: now(),
				updatedAt: now(),
			})
			.where(eq(aezaOnboardingProvision.id, fresh.id));
	}

	const afterOrder = await db.query.aezaOnboardingProvision.findFirst({
		where: eq(aezaOnboardingProvision.id, params.provisionId),
	});
	if (!afterOrder || afterOrder.status !== "provisioning") {
		return advanceAezaOnboardingProvision(params);
	}

	if (!afterOrder.serviceId) {
		const listUrl = `${base}/services?offset=0&count=100&sort=`;
		const listRes = await fetchJson(listUrl, {
			headers: { Authorization: `Bearer ${token}` },
		});
		const items = extractItems(listRes.json);
		const svc = pickServiceByName(items, afterOrder.serviceName);
		const sid = svc ? readId(svc) : null;
		if (sid) {
			await db
				.update(aezaOnboardingProvision)
				.set({
					serviceId: sid,
					updatedAt: now(),
				})
				.where(eq(aezaOnboardingProvision.id, afterOrder.id));
		}
		return {
			status: "provisioning",
			dokployServerId: null,
			message: null,
		};
	}

	const fresh2 = await db.query.aezaOnboardingProvision.findFirst({
		where: eq(aezaOnboardingProvision.id, params.provisionId),
	});
	if (!fresh2 || fresh2.status !== "provisioning") {
		return advanceAezaOnboardingProvision(params);
	}

	const listUrl = `${base}/services?offset=0&count=100&sort=`;
	const listRes = await fetchJson(listUrl, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!listRes.ok) {
		return {
			status: "provisioning",
			dokployServerId: null,
			message: null,
		};
	}
	const items = extractItems(listRes.json);
	const svc =
		pickServiceByName(items, fresh2.serviceName) ??
		items.find((it) => {
			if (!it || typeof it !== "object") return false;
			const o = it as Record<string, unknown>;
			return readId(o) === fresh2.serviceId;
		});
	if (!svc || typeof svc !== "object") {
		return {
			status: "provisioning",
			dokployServerId: null,
			message: null,
		};
	}
	const obj = svc as Record<string, unknown>;
	const ip = readIp(obj);
	const st = readStatus(obj);
	if (!fresh2.sshKeyId) {
		await markError("Missing SSH key on provision");
		return {
			status: "error",
			dokployServerId: null,
			message: "Missing SSH key on provision",
		};
	}
	const ready =
		ip &&
		(st === "active" || st === "running" || st === "ok" || st === "success");
	if (!ready) {
		return {
			status: "provisioning",
			dokployServerId: null,
			message: null,
		};
	}

	try {
		const orgRow = await db.query.organization.findFirst({
			where: eq(organization.id, fresh2.organizationId),
			columns: { ownerId: true },
		});
		if (!orgRow) {
			await markError("Organization not found");
			return {
				status: "error",
				dokployServerId: null,
				message: "Organization not found",
			};
		}
		const owner = await findUserById(orgRow.ownerId);
		const existingServers = await findServersByUserId(owner.id);
		const billableCount = existingServers.filter(
			(s) =>
				s.provisionSource !== "test" && s.name !== ONBOARDING_TEST_SERVER_NAME,
		).length;
		if (IS_CLOUD && billableCount >= owner.serversQuantity) {
			await markError("Server limit reached for your plan");
			return {
				status: "error",
				dokployServerId: null,
				message: "Server limit reached for your plan",
			};
		}

		const dokployServer = await createServer(
			{
				name: fresh2.serviceName,
				description: "Aeza VPS (onboarding)",
				ipAddress: ip,
				port: 22,
				username: "root",
				sshKeyId: fresh2.sshKeyId,
				serverType: "deploy",
			},
			fresh2.organizationId,
		);
		await db
			.update(server)
			.set({
				provisionSource: "aeza",
				serviceId: fresh2.serviceId,
			})
			.where(eq(server.serverId, dokployServer.serverId));
		await db
			.update(aezaOnboardingProvision)
			.set({
				status: "active",
				dokployServerId: dokployServer.serverId,
				updatedAt: now(),
			})
			.where(eq(aezaOnboardingProvision.id, fresh2.id));
		if (IS_CLOUD) {
			await syncPlanAccessBlockedForOwner(owner.id);
		}
		return {
			status: "active",
			dokployServerId: dokployServer.serverId,
			message: null,
		};
	} catch (e) {
		const msg =
			e instanceof TRPCError
				? e.message
				: e instanceof Error
					? e.message
					: "Failed to register server in Dokploy";
		await markError(msg);
		return { status: "error", dokployServerId: null, message: msg };
	}
}
