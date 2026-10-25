import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({
  createWardrobeItem: vi.fn(),
  deleteWardrobeItemForUser: vi.fn(),
  findAddableFragrance: vi.fn(),
  updateWardrobeItemForUser: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import {
  createWardrobeItem,
  deleteWardrobeItemForUser,
  findAddableFragrance,
  updateWardrobeItemForUser,
} from "./data";
import { addToWardrobeAction, deleteWardrobeItemAction, updateWardrobeItemAction } from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;

function signedOut() {
  vi.mocked(requireUser).mockImplementation(() => {
    throw new (class extends Error {
      digest = "NEXT_REDIRECT;replace;/sign-in;307;";
    })("NEXT_REDIRECT");
  });
}

const validForm = (overrides: Record<string, string> = {}) =>
  formData({
    fragranceId: "frag_1",
    kind: "BOTTLE",
    bottleSizeMl: "100",
    remainingMl: "80",
    priceDecimal: "3850",
    currency: "PHP",
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
  vi.mocked(findAddableFragrance).mockResolvedValue({ id: "frag_1" });
  vi.mocked(updateWardrobeItemForUser).mockResolvedValue(true);
  vi.mocked(deleteWardrobeItemForUser).mockResolvedValue(true);
});

describe("addToWardrobeAction", () => {
  it("adds the item for the session user and lands on its filter", async () => {
    const url = await expectRedirect(addToWardrobeAction(INITIAL, validForm({ kind: "DECANT" })));
    expect(url).toBe("/wardrobe?type=decant");
    const [userId, input] = vi.mocked(createWardrobeItem).mock.calls[0]!;
    expect(userId).toBe(SESSION_USER.id);
    expect(input).toMatchObject({ kind: "DECANT", bottleSizeMl: 100, purchasePriceMinor: 385_000 });
  });

  it("ignores a client-supplied user id", async () => {
    await expectRedirect(addToWardrobeAction(INITIAL, validForm({ userId: "user_attacker" })));
    expect(vi.mocked(createWardrobeItem).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("checks the fragrance is visible to the session user", async () => {
    vi.mocked(findAddableFragrance).mockResolvedValue(null);
    const state = await addToWardrobeAction(INITIAL, validForm());
    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("isn't available") });
    expect(findAddableFragrance).toHaveBeenCalledWith(SESSION_USER.id, "frag_1");
    expect(createWardrobeItem).not.toHaveBeenCalled();
  });

  it("returns field errors without writing", async () => {
    const state = await addToWardrobeAction(INITIAL, validForm({ bottleSizeMl: "" }));
    expect(state.fieldErrors?.bottleSizeMl).toBeDefined();
    expect(createWardrobeItem).not.toHaveBeenCalled();
  });

  it("redirects to sign-in without a session and writes nothing", async () => {
    signedOut();
    await expect(addToWardrobeAction(INITIAL, validForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createWardrobeItem).not.toHaveBeenCalled();
  });
});

describe("updateWardrobeItemAction", () => {
  it("updates the session user's item", async () => {
    await expectRedirect(
      updateWardrobeItemAction("item_1", INITIAL, validForm({ kind: "WISHLIST" })),
    );
    expect(updateWardrobeItemForUser).toHaveBeenCalledWith(
      SESSION_USER.id,
      "item_1",
      expect.objectContaining({ kind: "WISHLIST", remainingMl: null }),
    );
  });

  it("reports an item that is not the session user's", async () => {
    vi.mocked(updateWardrobeItemForUser).mockResolvedValue(false);
    const state = await updateWardrobeItemAction("someone_elses", INITIAL, validForm());
    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("no longer") });
    expect(vi.mocked(updateWardrobeItemForUser).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(updateWardrobeItemAction("item_1", INITIAL, validForm())).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(updateWardrobeItemForUser).not.toHaveBeenCalled();
  });
});

describe("deleteWardrobeItemAction", () => {
  it("deletes scoped to the session user", async () => {
    const url = await expectRedirect(deleteWardrobeItemAction("item_1"));
    expect(url).toBe("/wardrobe");
    expect(deleteWardrobeItemForUser).toHaveBeenCalledWith(SESSION_USER.id, "item_1");
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(deleteWardrobeItemAction("item_1")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(deleteWardrobeItemForUser).not.toHaveBeenCalled();
  });
});
