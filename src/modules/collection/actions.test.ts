import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({
  createCollectionItem: vi.fn(),
  deleteCollectionItemForUser: vi.fn(),
  findFragrancePreview: vi.fn(),
  updateCollectionItemForUser: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import {
  createCollectionItem,
  deleteCollectionItemForUser,
  findFragrancePreview,
  updateCollectionItemForUser,
} from "./data";
import {
  addToCollectionAction,
  deleteCollectionItemAction,
  updateCollectionItemAction,
} from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const OTHER_USER_ID = "user_attacker";

const INITIAL = { ok: false } as const;

function signedIn() {
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
}

/** What `requireUser` does for real when there is no session: it redirects. */
function signedOut() {
  vi.mocked(requireUser).mockImplementation(() => {
    throw new (class extends Error {
      digest = "NEXT_REDIRECT;replace;/sign-in;307;";
    })("NEXT_REDIRECT");
  });
}

function validForm(overrides: Record<string, string | undefined> = {}) {
  return formData({
    fragranceId: "frag_1",
    bottleSizeMl: "100",
    remainingMl: "80",
    priceDecimal: "150.00",
    currency: "usd",
    condition: "NEW",
    personalRating: "4",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findFragrancePreview).mockResolvedValue({
    id: "frag_1",
    name: "Aventus",
    brand: { name: "Creed" },
  });
  vi.mocked(updateCollectionItemForUser).mockResolvedValue(true);
  vi.mocked(deleteCollectionItemForUser).mockResolvedValue(true);
});

describe("addToCollectionAction", () => {
  it("persists the item and redirects to the collection", async () => {
    signedIn();

    const url = await expectRedirect(addToCollectionAction(INITIAL, validForm()));

    expect(url).toBe("/collection");
    expect(createCollectionItem).toHaveBeenCalledTimes(1);
    const [userId, input] = vi.mocked(createCollectionItem).mock.calls[0]!;
    expect(userId).toBe(SESSION_USER.id);
    expect(input).toMatchObject({
      fragranceId: "frag_1",
      bottleSizeMl: 100,
      remainingMl: 80,
      // Money is stored as integer minor units, and the ISO code is upper-cased.
      purchasePriceMinor: 15_000,
      currency: "USD",
      condition: "NEW",
      personalRating: 4,
    });
  });

  it("refuses to run without a session, and writes nothing", async () => {
    signedOut();

    await expect(addToCollectionAction(INITIAL, validForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createCollectionItem).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied userId and uses the session user", async () => {
    signedIn();

    // The threat: a hand-crafted POST that adds a bottle to someone else's
    // wardrobe (or attributes one to a victim). The action must never read a
    // user id off the form.
    await expectRedirect(
      addToCollectionAction(INITIAL, validForm({ userId: OTHER_USER_ID, id: "item_forged" })),
    );

    expect(vi.mocked(createCollectionItem).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("returns field errors instead of writing when the form is invalid", async () => {
    signedIn();

    const state = await addToCollectionAction(
      INITIAL,
      // Remaining exceeds bottle size, and a price is set without a currency.
      validForm({ remainingMl: "500", currency: "" }),
    );

    expect(state.ok).toBe(false);
    expect(state.fieldErrors).toMatchObject({
      remainingMl: expect.stringContaining("exceed"),
      currency: expect.stringContaining("Currency"),
    });
    expect(createCollectionItem).not.toHaveBeenCalled();
  });

  it("rejects a fragrance id that does not resolve", async () => {
    signedIn();
    vi.mocked(findFragrancePreview).mockResolvedValue(null);

    const state = await addToCollectionAction(INITIAL, validForm({ fragranceId: "frag_missing" }));

    expect(state).toMatchObject({
      ok: false,
      message: expect.stringContaining("no longer exists"),
    });
    expect(createCollectionItem).not.toHaveBeenCalled();
  });
});

describe("updateCollectionItemAction", () => {
  it("updates the caller's own item and redirects", async () => {
    signedIn();

    const url = await expectRedirect(updateCollectionItemAction("item_1", INITIAL, validForm()));

    expect(url).toBe("/collection");
    expect(updateCollectionItemForUser).toHaveBeenCalledWith(
      SESSION_USER.id,
      "item_1",
      expect.objectContaining({ bottleSizeMl: 100 }),
    );
  });

  it("scopes the update to the session user, so another user's item is not found", async () => {
    signedIn();
    // The data layer filters on (id, userId) and reports 0 rows matched.
    vi.mocked(updateCollectionItemForUser).mockResolvedValue(false);

    const state = await updateCollectionItemAction(
      "item_owned_by_someone_else",
      INITIAL,
      validForm(),
    );

    expect(state).toMatchObject({
      ok: false,
      message: expect.stringContaining("no longer in your collection"),
    });
    // Crucially it did NOT redirect, which would have implied a successful write.
    expect(vi.mocked(updateCollectionItemForUser).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("refuses to run without a session", async () => {
    signedOut();

    await expect(updateCollectionItemAction("item_1", INITIAL, validForm())).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(updateCollectionItemForUser).not.toHaveBeenCalled();
  });
});

describe("deleteCollectionItemAction", () => {
  it("deletes scoped to the session user and redirects", async () => {
    signedIn();

    const url = await expectRedirect(deleteCollectionItemAction("item_1"));

    expect(url).toBe("/collection");
    expect(deleteCollectionItemForUser).toHaveBeenCalledWith(SESSION_USER.id, "item_1");
  });

  it("refuses to run without a session", async () => {
    signedOut();

    await expect(deleteCollectionItemAction("item_1")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(deleteCollectionItemForUser).not.toHaveBeenCalled();
  });
});
