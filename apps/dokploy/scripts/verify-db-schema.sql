-- Проверка схемы для DeployBox / онбординга (выполнить в psql или клиенте к той же БД, что и DATABASE_URL).

-- 1) Какие миграции Drizzle реально применились (runtime migrate() пишет сюда)
SELECT id, hash, created_at
FROM drizzle."__drizzle_migrations"
ORDER BY created_at;

-- 2) Колонки таблицы server (поле serviceId в Drizzle → колонка serviceId; aezaServiceId — только если миграции не дошли до 0162+)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
	AND table_name = 'server'
	AND column_name IN (
		'serviceId',
		'aezaServiceId',
		'provisionSource',
		'onboardingTestServer'
	)
ORDER BY column_name;

-- 3) Значения enum serverProvisionSource (должно быть test)
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
	AND t.typname IN ('serverProvisionSource', 'serverprovisionsource')
ORDER BY e.enumsortorder;
