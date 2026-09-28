import type { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export async function migrate(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(82003200)");
    await client.query(
      "create table if not exists schema_migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now())",
    );
    for (const name of (await readdir("infra/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const sql = await readFile("infra/migrations/" + name, "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const prior = await client.query(
        "select checksum from schema_migrations where name=$1",
        [name],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].checksum !== hash)
          throw new Error("Applied migration changed: " + name);
        continue;
      }
      await client.query(sql);
      await client.query(
        "insert into schema_migrations(name,checksum) values($1,$2)",
        [name, hash],
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
