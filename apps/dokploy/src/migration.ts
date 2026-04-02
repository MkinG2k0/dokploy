import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbUrl } from "@dokploy/server/db";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/** Рядом с `dist/migration.mjs` лежит каталог `drizzle/` (см. Dockerfile). */
const migrationsFolder = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"drizzle",
);

const sql = postgres(dbUrl, { max: 1 });
const db = drizzle(sql);

try {
	await migrate(db, { migrationsFolder });
	console.log("Migration complete");
} catch (error) {
	console.error("Migration failed:", error);
	await sql.end({ timeout: 10 }).catch(() => {
		/* ignore */
	});
	process.exit(1);
}

await sql.end({ timeout: 10 });
