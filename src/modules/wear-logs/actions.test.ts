import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("./data", () => ({
  createWearForUser: vi.fn(),
  deleteWearForUser: vi.fn(),
  findCollectionItemOwnedByUser: vi.fn(),
  findUserTimeZone: vi.fn(),
  findWearTimeZoneForUser: vi.fn(),
  fragranceExists: vi.fn(),
  updateWearForUser: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import {
  createWearForUser,
  deleteWearForUser,
  findCollectionItemOwnedByUser,
  findUserTimeZone,
  findWearTimeZoneForUser,
  fragranceExists,
  updateWearForUser,
} from "./data";
import { deleteWearAction, logWearAction, updateWearAction } from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;

function signedIn() {
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
}

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
    wornAt: "2026-08-19T08:00",
    sprays: "5",
    occasion: "WORK",
    environment: "INDOOR",
    temperatureC: "30",
    humidityPct: "75",
    weatherCondition: "clear",
    longevityHours: "7.5",
    projection: "4",
    enjoyment: "5",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fragranceExists).mockResolvedValue({ id: "frag_1" });
  vi.mocked(findCollectionItemOwnedByUser).mockResolvedValue({
    id: "item_1",
    fragranceId: "frag_1",
  });
  vi.mocked(updateWearForUser).mockResolvedValue(true);
  vi.mocked(deleteWearForUser).mockResolvedValue(true);
  vi.mocked(findUserTimeZone).mockResolvedValue("UTC");
  vi.mocked(findWearTimeZoneForUser).mockResolvedValue("UTC");
});

describe("logWearAction", () => {
  it("logs a wear against the session user and redirects", async () => {
    signedIn();

    const url = await expectRedirect(logWearAction(INITIAL, validForm()));

    expect(url).toBe("/wear");
    const [userId, input] = vi.mocked(createWearForUser).mock.calls[0]!;
    expect(userId).toBe(SESSION_USER.id);
    expect(input).toMatchObject({
      fragranceId: "frag_1",
      sprays: 5,
      occasion: "WORK",
      environment: "INDOOR",
      temperatureC: 30,
      projection: 4,
      enjoyment: 5,
    });
  });

  it("reads the typed time in the user's zone and snapshots that zone", async () => {
    signedIn();
    vi.mocked(findUserTimeZone).mockResolvedValue("Asia/Manila");

    await expectRedirect(logWearAction(INITIAL, validForm({ wornAt: "2026-08-19T20:00" })));

    expect(findUserTimeZone).toHaveBeenCalledWith(SESSION_USER.id);
    const input = vi.mocked(createWearForUser).mock.calls[0]![1];
    expect(input.wornAt.toISOString()).toBe("2026-08-19T12:00:00.000Z");
    expect(input.timeZone).toBe("Asia/Manila");
  });

  it("rejects a malformed time without writing", async () => {
    signedIn();

    const state = await logWearAction(INITIAL, validForm({ wornAt: "2026-02-30T10:00" }));

    expect(state.fieldErrors?.wornAt).toBeDefined();
    expect(createWearForUser).not.toHaveBeenCalled();
  });

  it("refuses to run without a session, and writes nothing", async () => {
    signedOut();

    await expect(logWearAction(INITIAL, validForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createWearForUser).not.toHaveBeenCalled();
  });

  it("rejects a collection item the caller does not own", async () => {
    signedIn();
    // The data layer filters on (id, userId); someone else's bottle simply
    // isn't found.
    vi.mocked(findCollectionItemOwnedByUser).mockResolvedValue(null);

    const state = await logWearAction(
      INITIAL,
      validForm({ collectionItemId: "item_owned_by_someone_else" }),
    );

    expect(state).toMatchObject({
      ok: false,
      message: expect.stringContaining("not in your collection"),
    });
    expect(createWearForUser).not.toHaveBeenCalled();
    expect(vi.mocked(findCollectionItemOwnedByUser).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("takes the fragrance from the owned bottle, not from the form", async () => {
    signedIn();
    vi.mocked(findCollectionItemOwnedByUser).mockResolvedValue({
      id: "item_1",
      fragranceId: "frag_actually_owned",
    });

    // A tampered form claims the wear was of a different fragrance than the
    // bottle it is attached to. Letting that through would poison the user's
    // own analytics, so the server ignores the submitted id.
    await expectRedirect(
      logWearAction(
        INITIAL,
        validForm({ fragranceId: "frag_claimed_by_client", collectionItemId: "item_1" }),
      ),
    );

    expect(vi.mocked(createWearForUser).mock.calls[0]![1]).toMatchObject({
      fragranceId: "frag_actually_owned",
      collectionItemId: "item_1",
    });
  });

  it("allows a wear with no collection item (a sample or a borrow)", async () => {
    signedIn();

    await expectRedirect(logWearAction(INITIAL, validForm({ collectionItemId: "" })));

    expect(findCollectionItemOwnedByUser).not.toHaveBeenCalled();
    expect(fragranceExists).toHaveBeenCalledWith("frag_1");
    expect(vi.mocked(createWearForUser).mock.calls[0]![1]).toMatchObject({
      fragranceId: "frag_1",
      collectionItemId: null,
    });
  });

  it("rejects a sample wear against a fragrance that does not exist", async () => {
    signedIn();
    vi.mocked(fragranceExists).mockResolvedValue(null);

    const state = await logWearAction(INITIAL, validForm({ fragranceId: "frag_missing" }));

    expect(state).toMatchObject({
      ok: false,
      message: expect.stringContaining("no longer exists"),
    });
    expect(createWearForUser).not.toHaveBeenCalled();
  });

  it("returns field errors for an out-of-range spray count", async () => {
    signedIn();

    // Sprays are capped at 20 by the domain rules; 200 would wreck the
    // spray-based depletion and cost estimates.
    const state = await logWearAction(INITIAL, validForm({ sprays: "200" }));

    expect(state.ok).toBe(false);
    expect(state.fieldErrors?.sprays).toMatch(/20 sprays/);
    expect(createWearForUser).not.toHaveBeenCalled();
  });
});

describe("updateWearAction", () => {
  it("updates the caller's own wear and redirects", async () => {
    signedIn();

    const url = await expectRedirect(updateWearAction("wear_1", INITIAL, validForm()));

    expect(url).toBe("/wear");
    expect(updateWearForUser).toHaveBeenCalledWith(
      SESSION_USER.id,
      "wear_1",
      expect.objectContaining({ sprays: 5 }),
    );
  });

  it("reads an edited time in the wear's own zone, not the user's current one", async () => {
    signedIn();
    vi.mocked(findWearTimeZoneForUser).mockResolvedValue("America/New_York");
    vi.mocked(findUserTimeZone).mockResolvedValue("Asia/Manila");

    await expectRedirect(
      updateWearAction("wear_1", INITIAL, validForm({ wornAt: "2026-08-19T20:00" })),
    );

    expect(findWearTimeZoneForUser).toHaveBeenCalledWith(SESSION_USER.id, "wear_1");
    const input = vi.mocked(updateWearForUser).mock.calls[0]![2];
    expect(input.wornAt.toISOString()).toBe("2026-08-20T00:00:00.000Z");
  });

  it("does not update a wear that is not the session user's", async () => {
    signedIn();
    vi.mocked(findWearTimeZoneForUser).mockResolvedValue(null);

    const state = await updateWearAction("wear_owned_by_someone_else", INITIAL, validForm());

    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("no longer") });
    expect(updateWearForUser).not.toHaveBeenCalled();
  });

  it("scopes the update to the session user, so another user's wear is not found", async () => {
    signedIn();
    vi.mocked(updateWearForUser).mockResolvedValue(false);

    const state = await updateWearAction("wear_owned_by_someone_else", INITIAL, validForm());

    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("no longer") });
    expect(vi.mocked(updateWearForUser).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("refuses to run without a session", async () => {
    signedOut();

    await expect(updateWearAction("wear_1", INITIAL, validForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(updateWearForUser).not.toHaveBeenCalled();
  });
});

describe("deleteWearAction", () => {
  it("deletes scoped to the session user and redirects", async () => {
    signedIn();

    const url = await expectRedirect(deleteWearAction("wear_1"));

    expect(url).toBe("/wear");
    expect(deleteWearForUser).toHaveBeenCalledWith(SESSION_USER.id, "wear_1");
  });

  it("refuses to run without a session", async () => {
    signedOut();

    await expect(deleteWearAction("wear_1")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(deleteWearForUser).not.toHaveBeenCalled();
  });
});
