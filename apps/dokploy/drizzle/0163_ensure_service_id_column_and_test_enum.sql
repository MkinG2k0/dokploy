-- Идемпотентно: enum 'test' + колонка serviceId (из aezaServiceId) + перенос onboardingTestServer → provisionSource test.
DO $enum$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_enum e
		INNER JOIN pg_type t ON t.oid = e.enumtypid
		INNER JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = 'public'
			AND t.typtype = 'e'
			AND (
				t.typname = 'serverProvisionSource'
				OR t.typname = 'serverprovisionsource'
			)
			AND e.enumlabel = 'test'
	) THEN
		ALTER TYPE "serverProvisionSource" ADD VALUE 'test';
	END IF;
END
$enum$;
--> statement-breakpoint
DO $srv$
DECLARE
	has_aeza boolean;
	has_service boolean;
BEGIN
	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'server'
			AND a.attname = 'aezaServiceId'
			AND NOT a.attisdropped
	) INTO has_aeza;
	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'server'
			AND a.attname = 'serviceId'
			AND NOT a.attisdropped
	) INTO has_service;
	IF has_aeza AND NOT has_service THEN
		ALTER TABLE "server" RENAME COLUMN "aezaServiceId" TO "serviceId";
	ELSIF has_aeza AND has_service THEN
		UPDATE "server"
		SET "serviceId" = COALESCE("serviceId", "aezaServiceId")
		WHERE "serviceId" IS NULL
			AND "aezaServiceId" IS NOT NULL;
		ALTER TABLE "server" DROP COLUMN "aezaServiceId";
	END IF;
END
$srv$;
--> statement-breakpoint
DO $prov$
DECLARE
	has_aeza boolean;
	has_service boolean;
BEGIN
	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'aeza_onboarding_provision'
			AND a.attname = 'aezaServiceId'
			AND NOT a.attisdropped
	) INTO has_aeza;
	SELECT EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'aeza_onboarding_provision'
			AND a.attname = 'serviceId'
			AND NOT a.attisdropped
	) INTO has_service;
	IF has_aeza AND NOT has_service THEN
		ALTER TABLE "aeza_onboarding_provision" RENAME COLUMN "aezaServiceId" TO "serviceId";
	ELSIF has_aeza AND has_service THEN
		UPDATE "aeza_onboarding_provision"
		SET "serviceId" = COALESCE("serviceId", "aezaServiceId")
		WHERE "serviceId" IS NULL
			AND "aezaServiceId" IS NOT NULL;
		ALTER TABLE "aeza_onboarding_provision" DROP COLUMN "aezaServiceId";
	END IF;
END
$prov$;
--> statement-breakpoint
DO $onb$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'server'
			AND a.attname = 'onboardingTestServer'
			AND NOT a.attisdropped
	) THEN
		UPDATE "server"
		SET "provisionSource" = 'test'::"serverProvisionSource"
		WHERE "onboardingTestServer" = true;
		ALTER TABLE "server" DROP COLUMN "onboardingTestServer";
	END IF;
END
$onb$;
