-- serviceId: внешний ID услуги у провайдера. provisionSource 'test' — миграция 0160.
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'server'
			AND a.attname = 'aezaServiceId'
			AND NOT a.attisdropped
	) THEN
		ALTER TABLE "server" RENAME COLUMN "aezaServiceId" TO "serviceId";
	END IF;
END
$migration$;
--> statement-breakpoint
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'aeza_onboarding_provision'
			AND a.attname = 'aezaServiceId'
			AND NOT a.attisdropped
	) THEN
		ALTER TABLE "aeza_onboarding_provision" RENAME COLUMN "aezaServiceId" TO "serviceId";
	END IF;
END
$migration$;
--> statement-breakpoint
DO $migration$
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
$migration$;
