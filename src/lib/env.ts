import "server-only";
import { z } from "zod";

const EnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    // Only `prisma migrate` needs this; the running app does not, so a deploy
    // that sets it for builds alone must still boot. Checked when present.
    DIRECT_DATABASE_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
    AUTH_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Google sign-in is on when both are set (see src/modules/auth/google.ts).
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  })
  .refine((e) => Boolean(e.AUTH_GOOGLE_ID) === Boolean(e.AUTH_GOOGLE_SECRET), {
    message: "Set both AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, or neither",
    path: ["AUTH_GOOGLE_SECRET"],
  });

export type Env = z.infer<typeof EnvSchema>;

// Parse lazily so tooling that imports this file (e.g. types) does not blow up
// in environments without a full env file. Actual runtime callers get validation.
let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
