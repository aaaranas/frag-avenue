"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { takeToken } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import { hashPassword } from "./passwords";
import { SignInInput, SignUpInput } from "./schema";
import { createUserWithPassword, findUserByEmail } from "./data";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const INITIAL: FormState = { ok: false };

/**
 * Attempt budgets, overridable by environment.
 *
 * The defaults are the policy and are what ships. They are configurable because
 * the end-to-end suite drives real sign-ins and sign-ups from a single IP and
 * would otherwise exhaust the budget partway through a run — and, worse, stay
 * exhausted for the rest of the window, so the suite could not be re-run. The
 * limiter itself is unchanged; only the size of the bucket moves.
 */
function budget(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SIGNIN_ATTEMPTS = budget("AUTH_SIGNIN_ATTEMPTS", 10);
const SIGNUP_ATTEMPTS = budget("AUTH_SIGNUP_ATTEMPTS", 5);

function firstIssueByField(issues: readonly { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  const parsed = SignInInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: firstIssueByField(parsed.error.issues) };
  }

  // 10 attempts per 15 minutes per (ip, email) pair, by default.
  const ip = await requestIp();
  const rl = takeToken(`signin:${ip}:${parsed.data.email}`, SIGNIN_ATTEMPTS, 15 * 60_000);
  if (!rl.allowed) {
    logger.warn("signin.rate_limited", { ip, retryAfter: rl.retryAfterSeconds });
    return {
      ok: false,
      message: `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: next,
    });
  } catch (err) {
    // `signIn` throws a redirect on success — that must propagate.
    if (err instanceof AuthError) {
      return { ok: false, message: "Invalid email or password." };
    }
    throw err;
  }

  // Unreachable: signIn redirects on success.
  return INITIAL;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: formData.get("email"),
    name: formData.get("name") ?? undefined,
    password: formData.get("password"),
  };
  const parsed = SignUpInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: firstIssueByField(parsed.error.issues) };
  }

  // 5 sign-ups per hour per IP, by default.
  const ip = await requestIp();
  const rl = takeToken(`signup:${ip}`, SIGNUP_ATTEMPTS, 60 * 60_000);
  if (!rl.allowed) {
    logger.warn("signup.rate_limited", { ip, retryAfter: rl.retryAfterSeconds });
    return {
      ok: false,
      message: `Too many sign-up attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return { ok: false, fieldErrors: { email: "An account with this email already exists." } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await createUserWithPassword({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Extremely unlikely (account just created) — send them to sign-in.
      redirect("/sign-in");
    }
    throw err;
  }

  return INITIAL;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
