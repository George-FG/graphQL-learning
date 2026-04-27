import "dotenv/config";
import { defineConfig } from "prisma/config";

// prisma.config.ts is used exclusively by the Prisma CLI (migrations, introspection, etc.).
// For Supabase: DIRECT_URL points to port 5432 (direct, bypasses PgBouncer) — required for migrations.
// For Docker: DIRECT_URL == DATABASE_URL, so no difference.
// The running app (src/lib/prisma.ts) always uses DATABASE_URL (the pooler in prod).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});