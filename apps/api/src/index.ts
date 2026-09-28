import { Pool } from "pg";
import { migrate } from "./migrate.js";
import { buildServer } from "./server.js";
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required; use a separate v2 database.");
if (
  process.env.REQUIRE_EMAIL_CONFIRMATION === "true" &&
  (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
)
  throw new Error("Email confirmation requires SMTP_HOST and SMTP_FROM");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
await migrate(pool);
const app = await buildServer(pool, {
  origin: process.env.APP_ORIGIN ?? "http://localhost:3200",
  secure: process.env.COOKIE_SECURE === "true",
  registration: process.env.ALLOW_REGISTRATION === "true",
  logger: true,
});
await app.listen({
  port: Number(process.env.PORT ?? 3201),
  host: process.env.HOST ?? "127.0.0.1",
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
