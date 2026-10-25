import { beforeEach, describe, expect, it, vi } from "vitest";
import { formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({ updateUserTimeZone: vi.fn(), updateProfile: vi.fn() }));

import { requireUser } from "@/modules/auth/session";
import { updateProfile, updateUserTimeZone } from "./data";
import { setUsernameAction, updateProfileAction, updateTimeZoneAction } from "./actions";

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

describe("updateProfileAction", () => {
  const profile = (o: Record<string, string> = {}) =>
    formData({
      username: "@Andrea",
      name: " Andrea ",
      bio: "",
      defaultVisibility: "PUBLIC",
      units: "IMPERIAL",
      ...o,
    });

  it("saves normalised fields for the session user", async () => {
    vi.mocked(updateProfile).mockResolvedValue("ok");
    const state = await updateProfileAction(INITIAL, profile({ userId: "user_attacker" }));
    expect(state.ok).toBe(true);
    expect(updateProfile).toHaveBeenCalledWith(SESSION_USER.id, {
      username: "andrea",
      name: "Andrea",
      bio: null,
      defaultVisibility: "PUBLIC",
      units: "IMPERIAL",
    });
  });

  it("reports a taken username", async () => {
    vi.mocked(updateProfile).mockResolvedValue("taken");
    const state = await updateProfileAction(INITIAL, profile());
    expect(state.fieldErrors?.username).toMatch(/taken/);
  });

  it("validates without writing", async () => {
    const state = await updateProfileAction(
      INITIAL,
      profile({ username: "x", defaultVisibility: "FRIENDS" }),
    );
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["defaultVisibility", "username"]);
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe("setUsernameAction", () => {
  it("claims a username for the session user", async () => {
    vi.mocked(updateProfile).mockResolvedValue("ok");
    expect((await setUsernameAction(INITIAL, formData({ username: "Mika" }))).ok).toBe(true);
    expect(updateProfile).toHaveBeenCalledWith(SESSION_USER.id, { username: "mika" });
  });

  it("redirects to sign-in without a session", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      throw new (class extends Error {
        digest = "NEXT_REDIRECT;replace;/sign-in;307;";
      })("NEXT_REDIRECT");
    });
    await expect(setUsernameAction(INITIAL, formData({ username: "mika" }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe("updateProfileAction with omitted optional fields", () => {
  it("treats a missing name and bio as empty", async () => {
    vi.mocked(updateProfile).mockResolvedValue("ok");
    const state = await updateProfileAction(
      INITIAL,
      formData({ username: "andrea", defaultVisibility: "FOLLOWERS", units: "METRIC" }),
    );
    expect(state.ok).toBe(true);
    expect(updateProfile).toHaveBeenCalledWith(
      SESSION_USER.id,
      expect.objectContaining({ name: null, bio: null }),
    );
  });
});
