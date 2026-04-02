CREATE TYPE "public"."aezaOnboardingStatus" AS ENUM('provisioning', 'active', 'error');--> statement-breakpoint
CREATE TYPE "public"."serverProvisionSource" AS ENUM('manual', 'aeza');--> statement-breakpoint
CREATE TABLE "aeza_onboarding_provision" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"createdByUserId" text NOT NULL,
	"tariff" text NOT NULL,
	"serviceName" text NOT NULL,
	"status" "aezaOnboardingStatus" DEFAULT 'provisioning' NOT NULL,
	"aezaServiceId" text,
	"orderPlacedAt" text,
	"sshKeyId" text,
	"dokployServerId" text,
	"errorMessage" text,
	"createdAt" text NOT NULL,
	"updatedAt" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "provisionSource" "serverProvisionSource" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "aezaServiceId" text;--> statement-breakpoint
ALTER TABLE "aeza_onboarding_provision" ADD CONSTRAINT "aeza_onboarding_provision_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeza_onboarding_provision" ADD CONSTRAINT "aeza_onboarding_provision_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeza_onboarding_provision" ADD CONSTRAINT "aeza_onboarding_provision_sshKeyId_ssh-key_sshKeyId_fk" FOREIGN KEY ("sshKeyId") REFERENCES "public"."ssh-key"("sshKeyId") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aeza_onboarding_provision" ADD CONSTRAINT "aeza_onboarding_provision_dokployServerId_server_serverId_fk" FOREIGN KEY ("dokployServerId") REFERENCES "public"."server"("serverId") ON DELETE set null ON UPDATE no action;