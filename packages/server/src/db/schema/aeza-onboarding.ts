import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { organization } from "./account";
import { server } from "./server";
import { sshKeys } from "./ssh-key";
import { user } from "./user";

export const aezaOnboardingStatus = pgEnum("aezaOnboardingStatus", [
	"provisioning",
	"active",
	"error",
]);

export const aezaOnboardingProvision = pgTable("aeza_onboarding_provision", {
	id: text("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	organizationId: text("organizationId")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	createdByUserId: text("createdByUserId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	tariff: text("tariff").notNull(),
	/** Имя услуги при заказе в Aeza (поиск в списке /api/services). */
	serviceName: text("serviceName").notNull(),
	status: aezaOnboardingStatus("status").notNull().default("provisioning"),
	/** Внешний ID услуги у провайдера. Колонка в БД: `serviceId` (миграции 0162+). */
	serviceId: text("serviceId"),
	/** ISO timestamp: заказ в Aeza уже отправлен (не дублировать POST при poll). */
	orderPlacedAt: text("orderPlacedAt"),
	sshKeyId: text("sshKeyId").references(() => sshKeys.sshKeyId, {
		onDelete: "set null",
	}),
	dokployServerId: text("dokployServerId").references(() => server.serverId, {
		onDelete: "set null",
	}),
	errorMessage: text("errorMessage"),
	createdAt: text("createdAt").notNull(),
	updatedAt: text("updatedAt").notNull(),
});

export const aezaOnboardingProvisionRelations = relations(
	aezaOnboardingProvision,
	({ one }) => ({
		organization: one(organization, {
			fields: [aezaOnboardingProvision.organizationId],
			references: [organization.id],
		}),
		createdBy: one(user, {
			fields: [aezaOnboardingProvision.createdByUserId],
			references: [user.id],
		}),
		sshKey: one(sshKeys, {
			fields: [aezaOnboardingProvision.sshKeyId],
			references: [sshKeys.sshKeyId],
		}),
		dokployServer: one(server, {
			fields: [aezaOnboardingProvision.dokployServerId],
			references: [server.serverId],
		}),
	}),
);
