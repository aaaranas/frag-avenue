import { beforeEach, describe, expect, it, vi } from "vitest";
import { formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  findFollowable: vi.fn(),
  findWearForInteraction: vi.fn(),
  follow: vi.fn(),
  toggleKudos: vi.fn(),
  unfollow: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import { _resetRateLimitStore } from "@/lib/rate-limit";
import {
  createComment,
  deleteComment,
  findFollowable,
  findWearForInteraction,
  follow,
  toggleKudos,
  unfollow,
} from "./data";
import {
  addCommentAction,
  deleteCommentAction,
  followAction,
  toggleKudosAction,
  unfollowAction,
} from "./actions";

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
  vi.mocked(findWearForInteraction).mockResolvedValue({ id: "wear_1", userId: "friend" });
  vi.mocked(findFollowable).mockResolvedValue({ id: "friend", username: "mika" });
  vi.mocked(deleteComment).mockResolvedValue(true);
  vi.mocked(toggleKudos).mockResolvedValue(true);
});

describe("toggleKudosAction", () => {
  it("toggles kudos on a wear the viewer can see", async () => {
    await toggleKudosAction(formData({ wearId: "wear_1" }));
    expect(findWearForInteraction).toHaveBeenCalledWith("me", "wear_1");
    expect(toggleKudos).toHaveBeenCalledWith("me", "wear_1");
  });

  it("does nothing on a wear the viewer can't see", async () => {
    vi.mocked(findWearForInteraction).mockResolvedValue(null);
    await toggleKudosAction(formData({ wearId: "private_wear" }));
    expect(toggleKudos).not.toHaveBeenCalled();
  });

  it("does not allow kudos on your own wear", async () => {
    vi.mocked(findWearForInteraction).mockResolvedValue({ id: "wear_1", userId: "me" });
    await toggleKudosAction(formData({ wearId: "wear_1" }));
    expect(toggleKudos).not.toHaveBeenCalled();
  });

  it("is rate limited per user", async () => {
    for (let i = 0; i < 125; i++) await toggleKudosAction(formData({ wearId: "wear_1" }));
    expect(toggleKudos).toHaveBeenCalledTimes(120);
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(toggleKudosAction(formData({ wearId: "wear_1" }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(toggleKudos).not.toHaveBeenCalled();
  });
});

describe("addCommentAction", () => {
  it("comments as the session user on a visible wear", async () => {
    const state = await addCommentAction(
      INITIAL,
      formData({ wearId: "wear_1", body: "  Great pick  " }),
    );
    expect(state.ok).toBe(true);
    expect(createComment).toHaveBeenCalledWith("me", "wear_1", "Great pick");
  });

  it("refuses a wear the viewer can't see", async () => {
    vi.mocked(findWearForInteraction).mockResolvedValue(null);
    const state = await addCommentAction(INITIAL, formData({ wearId: "hidden", body: "hi" }));
    expect(state.ok).toBe(false);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    expect(
      (await addCommentAction(INITIAL, formData({ wearId: "w", body: "   " }))).fieldErrors?.body,
    ).toBeDefined();
    expect(
      (await addCommentAction(INITIAL, formData({ wearId: "w", body: "x".repeat(1001) })))
        .fieldErrors?.body,
    ).toBeDefined();
    expect(createComment).not.toHaveBeenCalled();
  });

  it("is rate limited per user", async () => {
    for (let i = 0; i < 20; i++)
      await addCommentAction(INITIAL, formData({ wearId: "wear_1", body: "hi" }));
    const state = await addCommentAction(INITIAL, formData({ wearId: "wear_1", body: "hi" }));
    expect(state.message).toMatch(/very fast/);
    expect(createComment).toHaveBeenCalledTimes(20);
  });
});

describe("deleteCommentAction", () => {
  it("deletes scoped to the session user (author or wear owner, enforced in the query)", async () => {
    await deleteCommentAction(formData({ commentId: "c1" }));
    expect(deleteComment).toHaveBeenCalledWith("me", "c1");
  });
});

describe("follow / unfollow", () => {
  it("follows another user", async () => {
    await followAction(formData({ userId: "friend" }));
    expect(follow).toHaveBeenCalledWith("me", "friend");
  });

  it("does not follow yourself or someone who doesn't exist", async () => {
    await followAction(formData({ userId: "me" }));
    vi.mocked(findFollowable).mockResolvedValue(null);
    await followAction(formData({ userId: "ghost" }));
    expect(follow).not.toHaveBeenCalled();
  });

  it("unfollows as the session user, ignoring any client-supplied follower", async () => {
    await unfollowAction(formData({ userId: "friend", followerId: "someone_else" }));
    expect(unfollow).toHaveBeenCalledWith("me", "friend");
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(followAction(formData({ userId: "friend" }))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(follow).not.toHaveBeenCalled();
  });
});
