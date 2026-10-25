import { beforeEach, describe, expect, it, vi } from "vitest";
import { expectRedirect, formData } from "@/tests/helpers/next-redirect";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", async () =>
  (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
);
vi.mock("@/modules/auth/session", () => ({ requireUser: vi.fn() }));
const snapshot = vi.hoisted(() => vi.fn());
vi.mock("@/modules/weather/service", () => ({
  getWeatherService: () => ({ provider: "test", snapshot }),
}));
vi.mock("./data", () => ({
  createCheckIn: vi.fn(),
  createWear: vi.fn(),
  deleteWearForUser: vi.fn(),
  findLogDefaults: vi.fn(),
  findWearForCheckIn: vi.fn(),
  findWearTimeZoneForUser: vi.fn(),
  findWearableItem: vi.fn(),
  updateWearForUser: vi.fn(),
}));

import { requireUser } from "@/modules/auth/session";
import {
  createCheckIn,
  createWear,
  deleteWearForUser,
  findLogDefaults,
  findWearForCheckIn,
  findWearTimeZoneForUser,
  findWearableItem,
  updateWearForUser,
} from "./data";
import { deleteWearAction, logWearAction, recordCheckInAction, updateWearAction } from "./actions";

const SESSION_USER = { id: "user_session", email: "owner@frag.test", name: null, image: null };
const INITIAL = { ok: false } as const;
const HOUR = 60 * 60 * 1000;

function signedOut() {
  vi.mocked(requireUser).mockImplementation(() => {
    throw new (class extends Error {
      digest = "NEXT_REDIRECT;replace;/sign-in;307;";
    })("NEXT_REDIRECT");
  });
}

const logForm = (o: Record<string, string> = {}) =>
  formData({
    itemId: "item_1",
    wornAt: "2026-10-25T09:00",
    sprays: "4",
    occasion: "WORK",
    mood: "FOCUSED",
    notes: "Office day",
    visibility: "FOLLOWERS",
    ...o,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T08:00:00Z")); // 16:00 in Manila
  vi.mocked(requireUser).mockResolvedValue(SESSION_USER);
  vi.mocked(findWearableItem).mockResolvedValue({
    id: "item_1",
    kind: "BOTTLE",
    fragranceId: "frag_1",
    bottleSizeMl: 100,
    remainingMl: 80,
    fragrance: { name: "Hawas Ice", imagePath: null, brand: { name: "Rasasi" } },
  });
  vi.mocked(findLogDefaults).mockResolvedValue({
    timezone: "Asia/Manila",
    defaultVisibility: "FOLLOWERS",
    units: "METRIC",
  });
  vi.mocked(createWear).mockResolvedValue({ id: "wear_new" });
  vi.mocked(findWearTimeZoneForUser).mockResolvedValue("Asia/Manila");
  vi.mocked(updateWearForUser).mockResolvedValue(true);
  vi.mocked(deleteWearForUser).mockResolvedValue(true);
  vi.mocked(createCheckIn).mockResolvedValue(true);
  snapshot.mockResolvedValue({
    temperatureC: 31.5,
    humidityPct: 74,
    condition: "clear",
    observedAt: new Date("2026-10-25T01:00:00Z"),
    provider: "test",
  });
});

describe("logWearAction", () => {
  it("logs a wear of the session user's item, in their zone, and opens it", async () => {
    const url = await expectRedirect(logWearAction(INITIAL, logForm()));
    expect(url).toBe("/wears/wear_new");
    expect(findWearableItem).toHaveBeenCalledWith(SESSION_USER.id, "item_1");
    const [userId, input] = vi.mocked(createWear).mock.calls[0]!;
    expect(userId).toBe(SESSION_USER.id);
    expect(input).toMatchObject({
      fragranceId: "frag_1",
      collectionItemId: "item_1",
      timeZone: "Asia/Manila",
      wornAt: new Date("2026-10-25T01:00:00Z"), // 09:00 Manila
      sprays: 4,
      occasion: "WORK",
      mood: "FOCUSED",
      notes: "Office day",
      visibility: "FOLLOWERS",
      weather: null, // no location sent
    });
    expect(snapshot).not.toHaveBeenCalled();
  });

  it("attaches weather for the wear's time when a location is sent, without storing it", async () => {
    await expectRedirect(logWearAction(INITIAL, logForm({ lat: "14.5995", lon: "120.9842" })));
    expect(snapshot).toHaveBeenCalledWith(
      { lat: 14.5995, lon: 120.9842 },
      new Date("2026-10-25T01:00:00Z"),
    );
    const input = vi.mocked(createWear).mock.calls[0]![1];
    expect(input.weather).toMatchObject({ temperatureC: 31.5, humidityPct: 74, provider: "test" });
    expect(JSON.stringify(input)).not.toMatch(/14\.59|120\.98/);
  });

  it("still logs the wear when the weather is unavailable", async () => {
    snapshot.mockResolvedValue(null);
    await expectRedirect(logWearAction(INITIAL, logForm({ lat: "14.6", lon: "121" })));
    expect(vi.mocked(createWear).mock.calls[0]![1].weather).toBeNull();
  });

  it("refuses an item that isn't the user's own wearable item (another user's, or wishlist)", async () => {
    vi.mocked(findWearableItem).mockResolvedValue(null);
    const state = await logWearAction(INITIAL, logForm({ itemId: "not_mine" }));
    expect(state).toMatchObject({
      ok: false,
      message: expect.stringContaining("isn't in your wardrobe"),
    });
    expect(createWear).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied user id", async () => {
    await expectRedirect(logWearAction(INITIAL, logForm({ userId: "user_attacker" })));
    expect(vi.mocked(createWear).mock.calls[0]![0]).toBe(SESSION_USER.id);
  });

  it("rejects a wear in the future", async () => {
    const state = await logWearAction(INITIAL, logForm({ wornAt: "2026-10-25T18:00" }));
    expect(state.fieldErrors?.wornAt).toMatch(/future/);
    expect(createWear).not.toHaveBeenCalled();
  });

  it("rejects 11 sprays", async () => {
    const state = await logWearAction(INITIAL, logForm({ sprays: "11" }));
    expect(state.fieldErrors?.sprays).toBeDefined();
    expect(createWear).not.toHaveBeenCalled();
  });

  it("redirects to sign-in without a session and writes nothing", async () => {
    signedOut();
    await expect(logWearAction(INITIAL, logForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createWear).not.toHaveBeenCalled();
  });
});

describe("updateWearAction", () => {
  const editForm = (o: Record<string, string> = {}) =>
    formData({
      wornAt: "2026-10-24T20:00",
      sprays: "3",
      occasion: "DATE",
      visibility: "PRIVATE",
      ...o,
    });

  it("reads the time in the wear's own zone and updates only the user's wear", async () => {
    vi.mocked(findWearTimeZoneForUser).mockResolvedValue("America/New_York");
    await expectRedirect(updateWearAction("wear_1", INITIAL, editForm()));
    expect(findWearTimeZoneForUser).toHaveBeenCalledWith(SESSION_USER.id, "wear_1");
    expect(updateWearForUser).toHaveBeenCalledWith(
      SESSION_USER.id,
      "wear_1",
      expect.objectContaining({ wornAt: new Date("2026-10-25T00:00:00Z"), visibility: "PRIVATE" }),
    );
  });

  it("does not touch another user's wear", async () => {
    vi.mocked(findWearTimeZoneForUser).mockResolvedValue(null);
    const state = await updateWearAction("someone_elses", INITIAL, editForm());
    expect(state).toMatchObject({ ok: false, message: expect.stringContaining("no longer") });
    expect(updateWearForUser).not.toHaveBeenCalled();
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(updateWearAction("wear_1", INITIAL, editForm())).rejects.toThrow(/NEXT_REDIRECT/);
    expect(updateWearForUser).not.toHaveBeenCalled();
  });
});

describe("deleteWearAction", () => {
  it("deletes scoped to the session user", async () => {
    expect(await expectRedirect(deleteWearAction("wear_1"))).toBe("/wears");
    expect(deleteWearForUser).toHaveBeenCalledWith(SESSION_USER.id, "wear_1");
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(deleteWearAction("wear_1")).rejects.toThrow(/NEXT_REDIRECT/);
    expect(deleteWearForUser).not.toHaveBeenCalled();
  });
});

describe("recordCheckInAction", () => {
  const now = () => new Date("2026-10-25T08:00:00Z");
  const wornAgo = (h: number) => new Date(now().getTime() - h * HOUR);
  const answer = (offsetHours: string, result = "STRONG") =>
    formData({ wearId: "wear_1", offsetHours, result });

  it("records the open prompt for the user's own wear", async () => {
    vi.mocked(findWearForCheckIn).mockResolvedValue({
      id: "wear_1",
      wornAt: wornAgo(4.5),
      checkIns: [],
    });
    await recordCheckInAction(answer("4", "FAINT"));
    expect(findWearForCheckIn).toHaveBeenCalledWith(SESSION_USER.id, "wear_1");
    expect(createCheckIn).toHaveBeenCalledWith(SESSION_USER.id, "wear_1", 4, "FAINT");
  });

  it("ignores an answer for a prompt that is not open", async () => {
    vi.mocked(findWearForCheckIn).mockResolvedValue({
      id: "wear_1",
      wornAt: wornAgo(4.5),
      checkIns: [],
    });
    await recordCheckInAction(answer("2")); // the 2h prompt closed at 4h
    await recordCheckInAction(answer("8")); // not open until 8h
    expect(createCheckIn).not.toHaveBeenCalled();
  });

  it("ignores answers after Gone", async () => {
    vi.mocked(findWearForCheckIn).mockResolvedValue({
      id: "wear_1",
      wornAt: wornAgo(9),
      checkIns: [{ offsetHours: 4, result: "GONE" }],
    });
    await recordCheckInAction(answer("8"));
    expect(createCheckIn).not.toHaveBeenCalled();
  });

  it("ignores another user's wear and malformed input", async () => {
    vi.mocked(findWearForCheckIn).mockResolvedValue(null);
    await recordCheckInAction(answer("2"));
    await recordCheckInAction(formData({ wearId: "wear_1", offsetHours: "3", result: "STRONG" }));
    expect(createCheckIn).not.toHaveBeenCalled();
  });

  it("redirects to sign-in without a session", async () => {
    signedOut();
    await expect(recordCheckInAction(answer("2"))).rejects.toThrow(/NEXT_REDIRECT/);
    expect(createCheckIn).not.toHaveBeenCalled();
  });
});
