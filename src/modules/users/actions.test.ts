import { beforeEach, describe, expect, it, vi } from "vitest";
import { formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({ updateUserTimeZone: vi.fn() }));

import { requireUser } from "@/modules/auth/session";
import { updateUserTimeZone } from "./data";
import { updateTimeZoneAction } from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
});

describe("updateTimeZoneAction", () => {
  it("stores a valid zone for the session user", async () => {
    const state = await updateTimeZoneAction(INITIAL, formData({ timezone: "Asia/Manila" }));
    expect(state.ok).toBe(true);
    expect(updateUserTimeZone).toHaveBeenCalledWith(SESSION_USER.id, "Asia/Manila");
  });

  it("ignores any client-supplied user id", async () => {
    await updateTimeZoneAction(INITIAL, formData({ timezone: "UTC", userId: "user_attacker" }));
    expect(vi.mocked(updateUserTimeZone).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("rejects an unknown zone without writing", async () => {
    const state = await updateTimeZoneAction(INITIAL, formData({ timezone: "Mars/Base" }));
    expect(state.ok).toBe(false);
    expect(state.fieldErrors?.timezone).toBeDefined();
    expect(updateUserTimeZone).not.toHaveBeenCalled();
  });

  it("redirects to sign-in without a session and writes nothing", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      throw new (class extends Error {
        digest = "NEXT_REDIRECT;replace;/sign-in;307;";
      })("NEXT_REDIRECT");
    });
    await expect(updateTimeZoneAction(INITIAL, formData({ timezone: "UTC" }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(updateUserTimeZone).not.toHaveBeenCalled();
  });
});
