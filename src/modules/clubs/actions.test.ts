import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({
  createClub: vi.fn(),
  findClubForMembership: vi.fn(),
  joinClub: vi.fn(),
  leaveClub: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import { createClub, findClubForMembership, joinClub, leaveClub } from "./data";
import { createClubAction, joinClubAction, leaveClubAction } from "./actions";

const ME = { id: "me", email: "me@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;

function signedOut() {
  vi.mocked(requireUser).mockImplementation(() => {
    throw new (class extends Error {
      digest = "NEXT_REDIRECT;replace;/sign-in;307;";
    })("NEXT_REDIRECT");
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  _resetRateLimitStore();
  vi.mocked(requireUser).mockResolvedValue(ME);
  vi.mocked(createClub).mockResolvedValue({ slug: "manila-fragheads" });
  vi.mocked(findClubForMembership).mockResolvedValue({ id: "club_1", slug: "manila-fragheads" });
});

describe("createClubAction", () => {
  it("creates a club owned by the session user and opens it", async () => {
    const url = await expectRedirect(
      createClubAction(
        INITIAL,
        formData({ name: " Manila Fragheads ", description: "", createdById: "x" }),
      ),
    );
    expect(url).toBe("/clubs/manila-fragheads");
    expect(createClub).toHaveBeenCalledWith("me", {
      name: "Manila Fragheads",
      description: undefined,
    });
  });

  it("reports a name that's taken", async () => {
    vi.mocked(createClub).mockResolvedValue("taken");
    const state = await createClubAction(INITIAL, formData({ name: "Manila Fragheads" }));
    expect(state.fieldErrors?.name).toMatch(/exists/);
  });

  it("validates without writing", async () => {
    expect(
      (await createClubAction(INITIAL, formData({ name: "ab" }))).fieldErrors?.name,
    ).toBeDefined();
    expect(
      (await createClubAction(INITIAL, formData({ name: "!!!!" }))).fieldErrors?.name,
    ).toBeDefined();
    expect(createClub).not.toHaveBeenCalled();
  });

  it("is rate limited per user", async () => {
    for (let i = 0; i < 5; i++)
      await expectRedirect(createClubAction(INITIAL, formData({ name: `Club ${i}` })));
    const state = await createClubAction(INITIAL, formData({ name: "One more" }));
    expect(state.message).toMatch(/tomorrow/);
    expect(createClub).toHaveBeenCalledTimes(5);
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(createClubAction(INITIAL, formData({ name: "Club" }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(createClub).not.toHaveBeenCalled();
  });
});

describe("join / leave", () => {
  it("joins an existing club as the session user", async () => {
    await joinClubAction(formData({ clubId: "club_1", userId: "someone_else" }));
    expect(joinClub).toHaveBeenCalledWith("me", "club_1");
  });

  it("does not join a club that doesn't exist", async () => {
    vi.mocked(findClubForMembership).mockResolvedValue(null);
    await joinClubAction(formData({ clubId: "ghost" }));
    expect(joinClub).not.toHaveBeenCalled();
  });

  it("leaves as the session user", async () => {
    await leaveClubAction(formData({ clubId: "club_1" }));
    expect(leaveClub).toHaveBeenCalledWith("me", "club_1");
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(joinClubAction(formData({ clubId: "club_1" }))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(joinClub).not.toHaveBeenCalled();
  });
});
