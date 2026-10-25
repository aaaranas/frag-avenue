import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({ submitFragrance: vi.fn() }));

import { requireUser } from "@/modules/auth/session";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { submitFragrance } from "./data";
import { submitFragranceAction } from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;
const valid = (o: Record<string, string> = {}) =>
  formData({
    brand: "Example House",
    name: "Example Scent",
    concentration: "EDP",
    releaseYear: "2023",
    ...o,
  });

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimitStore();
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
  vi.mocked(submitFragrance).mockResolvedValue({ kind: "created", id: "frag_new" });
});

describe("submitFragranceAction", () => {
  it("creates a pending entry for the session user and opens it", async () => {
    const url = await expectRedirect(submitFragranceAction(INITIAL, valid({ userId: "attacker" })));
    expect(url).toBe("/fragrances/frag_new");
    expect(submitFragrance).toHaveBeenCalledWith(SESSION_USER.id, {
      brand: "Example House",
      name: "Example Scent",
      concentration: "EDP",
      releaseYear: 2023,
    });
  });

  it("opens the existing entry instead of duplicating it", async () => {
    vi.mocked(submitFragrance).mockResolvedValue({ kind: "exists", id: "frag_old" });
    expect(await expectRedirect(submitFragranceAction(INITIAL, valid()))).toBe(
      "/fragrances/frag_old",
    );
  });

  it("does not reveal another user's pending submission", async () => {
    vi.mocked(submitFragrance).mockResolvedValue({ kind: "pending-elsewhere" });
    const state = await submitFragranceAction(INITIAL, valid());
    expect(state.ok).toBe(false);
    expect(JSON.stringify(state)).not.toMatch(/frag_/);
  });

  it("validates input without writing", async () => {
    const state = await submitFragranceAction(
      INITIAL,
      valid({ brand: " ", concentration: "PERFUME", releaseYear: "3000" }),
    );
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual([
      "brand",
      "concentration",
      "releaseYear",
    ]);
    expect(submitFragrance).not.toHaveBeenCalled();
  });

  it("rate-limits per user", async () => {
    for (let i = 0; i < 20; i++) await expectRedirect(submitFragranceAction(INITIAL, valid()));
    const state = await submitFragranceAction(INITIAL, valid());
    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("tomorrow") });
    expect(submitFragrance).toHaveBeenCalledTimes(20);
  });

  it("redirects to sign-in without a session and writes nothing", async () => {
    vi.mocked(requireUser).mockImplementation(() => {
      throw new (class extends Error {
        digest = "NEXT_REDIRECT;replace;/sign-in;307;";
      })("NEXT_REDIRECT");
    });
    await expect(submitFragranceAction(INITIAL, valid())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(submitFragrance).not.toHaveBeenCalled();
  });
});
