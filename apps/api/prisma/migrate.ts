/** Apply reviewed Prisma-generated SQL without a native schema engine.
 * Checksum journal is deliberately separate from Prisma CLI's private table. */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(3072026)`;
      await tx.$executeRawUnsafe(
        'CREATE TABLE IF NOT EXISTS "_xr_migrations" (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
      );
      const applied = await tx.$queryRaw<
        { name: string; checksum: string }[]
      >`SELECT name, checksum FROM "_xr_migrations"`;
      for (const entry of (
        await readdir(resolve("prisma/migrations"), { withFileTypes: true })
      )
        .filter((d) => d.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        const sql = await readFile(
          resolve("prisma/migrations", entry.name, "migration.sql"),
          "utf8",
        );
        const checksum = createHash("sha256").update(sql).digest("hex");
        const existing = applied.find((a) => a.name === entry.name);
        if (existing) {
          if (existing.checksum !== checksum)
            throw new Error(`Migration checksum mismatch: ${entry.name}`);
          continue;
        }
        // Generated migrations contain ordinary DDL statements, no procedural bodies.
        for (const statement of sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await tx.$executeRawUnsafe(statement);
        await tx.$executeRaw`INSERT INTO "_xr_migrations" (name, checksum) VALUES (${entry.name},${checksum})`;
        console.log(`Applied ${entry.name}`);
      }
    },
    { timeout: 60000 },
  );
  console.log("Migrations up to date.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
