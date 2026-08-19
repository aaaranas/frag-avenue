import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectError, expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/auth", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
// Importing the real next-auth drags in `next/server`, which does not resolve
// under vitest's node environment. `AuthError` is only used as an instanceof
// brand here, so a stand-in class is enough — and because actions.ts resolves
// the same mock, the instanceof check under test is the real one.
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "CredentialsSignin";
  },
}));
vi.mock("@/lib/request-ip", () => ({ requestIp: vi.fn(async () => "203.0.113.7") }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("./passwords", () => ({
  // bcrypt at cost 12 is ~250ms a call by design; the real hashing is covered
  // by passwords.test.ts, so here we only care that it is invoked.
  hashPassword: vi.fn(async (plain: string) => `hashed:${plain}`),
  verifyPassword: vi.fn(),
}));
vi.mock("./data", () => ({
  createUserWithPassword: vi.fn(),
  findUserByEmail: vi.fn(),
}));

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { hashPassword } from "./passwords";
import { createUserWithPassword, findUserByEmail } from "./data";
import { signInAction, signOutAction, signUpAction } from "./actions";

const INITIAL = { ok: false } as const;

/** What next-auth's `signIn` really does on success: it throws a redirect. */
function signInSucceeds(destination = "/dashboard") {
  vi.mocked(signIn).mockImplementation(() => {
    throw new RedirectError(destination);
  });
}

function signInRejectsCredentials() {
  vi.mocked(signIn).mockImplementation(() => {
    throw new AuthError("CredentialsSignin");
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimitStore();
  vi.mocked(findUserByEmail).mockResolvedValue(null);
});

describe("signInAction", () => {
  it("signs in with the submitted credentials and lands on the dashboard", async () => {
    signInSucceeds();

    const url = await expectRedirect(
      signInAction(INITIAL, formData({ email: "Owner@Frag.test", password: "correct-horse" })),
    );

    expect(url).toBe("/dashboard");
    expect(signIn).toHaveBeenCalledWith("credentials", {
      // The schema lower-cases the address, so casing can't fork an account.
      email: "owner@frag.test",
      password: "correct-horse",
      redirectTo: "/dashboard",
    });
  });

  it("reports a generic failure for bad credentials", async () => {
    signInRejectsCredentials();

    const state = await signInAction(
      INITIAL,
      formData({ email: "owner@frag.test", password: "wrong" }),
    );

    // Deliberately does not distinguish "no such user" from "wrong password" —
    // that difference is an account-enumeration oracle.
    expect(state).toMatchObject({ ok: false, message: "Invalid email or password." });
  });

  it("honours a relative `next` destination", async () => {
    signInSucceeds("/insights");

    await expectRedirect(
      signInAction(
        INITIAL,
        formData({ email: "owner@frag.test", password: "correct-horse", next: "/insights" }),
      ),
    );

    expect(vi.mocked(signIn).mock.calls[0]![1]).toMatchObject({ redirectTo: "/insights" });
  });

  it("refuses an absolute `next` destination, falling back to the dashboard", async () => {
    signInSucceeds();

    // Open-redirect guard: only same-origin paths beginning with "/" are used.
    await expectRedirect(
      signInAction(
        INITIAL,
        formData({
          email: "owner@frag.test",
          password: "correct-horse",
          next: "https://evil.example/harvest",
        }),
      ),
    );

    expect(vi.mocked(signIn).mock.calls[0]![1]).toMatchObject({ redirectTo: "/dashboard" });
  });

  it("rate-limits repeated attempts against the same email", async () => {
    signInRejectsCredentials();
    const attempt = () =>
      signInAction(INITIAL, formData({ email: "target@frag.test", password: "guess" }));

    // The bucket holds 10 tokens per 15 minutes per (ip, email).
    for (let i = 0; i < 10; i++) {
      expect((await attempt()).message).toBe("Invalid email or password.");
    }

    const blocked = await attempt();
    expect(blocked.message).toMatch(/Too many attempts/);
    expect(signIn).toHaveBeenCalledTimes(10);
  });

  it("rejects a malformed email without calling signIn", async () => {
    const state = await signInAction(INITIAL, formData({ email: "not-an-email", password: "x" }));

    expect(state.fieldErrors?.email).toMatch(/valid email/);
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("signUpAction", () => {
  const validSignUp = { email: "new@frag.test", name: "New User", password: "long-enough-pw" };

  it("creates the account with a hashed password and signs the user in", async () => {
    signInSucceeds();

    const url = await expectRedirect(signUpAction(INITIAL, formData(validSignUp)));

    expect(url).toBe("/dashboard");
    expect(hashPassword).toHaveBeenCalledWith("long-enough-pw");
    expect(createUserWithPassword).toHaveBeenCalledWith({
      email: "new@frag.test",
      name: "New User",
      passwordHash: "hashed:long-enough-pw",
    });
    // The plaintext must never reach the data layer.
    const persisted = JSON.stringify(vi.mocked(createUserWithPassword).mock.calls[0]![0]);
    expect(persisted).not.toContain('"long-enough-pw"');
  });

  it("refuses an email that already has an account", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "user_existing",
      email: "new@frag.test",
      name: null,
      emailVerified: null,
      image: null,
      passwordHash: "hashed:whatever",
      timezone: "UTC",
      defaultCurrency: "PHP",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const state = await signUpAction(INITIAL, formData(validSignUp));

    expect(state.fieldErrors?.email).toMatch(/already exists/);
    expect(createUserWithPassword).not.toHaveBeenCalled();
  });

  it("rejects a password below the minimum length before touching the database", async () => {
    const state = await signUpAction(INITIAL, formData({ ...validSignUp, password: "short" }));

    expect(state.fieldErrors?.password).toMatch(/at least 8/);
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(createUserWithPassword).not.toHaveBeenCalled();
  });

  it("rate-limits sign-ups per IP", async () => {
    signInSucceeds();

    // 5 per hour per IP, regardless of the email used.
    for (let i = 0; i < 5; i++) {
      await expectRedirect(
        signUpAction(INITIAL, formData({ ...validSignUp, email: `burst${i}@frag.test` })),
      );
    }

    const blocked = await signUpAction(
      INITIAL,
      formData({ ...validSignUp, email: "burst5@frag.test" }),
    );
    expect(blocked.message).toMatch(/Too many sign-up attempts/);
    expect(createUserWithPassword).toHaveBeenCalledTimes(5);
  });
});

describe("signOutAction", () => {
  // This is the action the profile page's inline form wraps.
  it("signs out and returns the user to the landing page", async () => {
    await signOutAction();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
