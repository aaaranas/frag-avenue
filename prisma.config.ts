import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration. Replaces the `prisma` key in package.json, which is
 * removed in Prisma 7.
 *
 * Once this file exists the CLI stops loading `.env` automatically, so we do it
 * ourselves — `DATABASE_URL` lives there for local development. `loadEnvFile`
 * landed in Node 20.12; it is guarded so an older runtime degrades to "the env
 * must already be exported" rather than crashing. In CI the variables are set on
 * the job, and no `.env` exists, hence the try/catch around the missing file.
 */
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // No .env on disk (CI) — variables come from the environment.
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
