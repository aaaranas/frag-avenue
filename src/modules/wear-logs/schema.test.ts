import { describe, expect, it } from "vitest";
import { CheckInInput, EditWearInput, LogWearInput, isInFuture, toWearFields } from "./schema";

const fields = {
  wornAt: "2026-10-25T20:00",
  sprays: "4",
  occasion: "DATE",
  visibility: "FOLLOWERS",
};
const issuesAt = (input: object, key: string) => {
  const r = LogWearInput.safeParse(input);
  return r.success ? [] : r.error.issues.filter((i) => i.path[0] === key);
};

describe("LogWearInput", () => {
  it("accepts an owned item with the required fields", () => {
    const r = LogWearInput.parse({ itemId: "item_1", ...fields });
    expect(r).toMatchObject({
      itemId: "item_1",
      sprays: 4,
      occasion: "DATE",
      visibility: "FOLLOWERS",
    });
    expect(r.mood).toBeUndefined();
    expect(r.lat).toBeUndefined();
  });

  it("requires an item", () => {
    expect(issuesAt({ ...fields }, "itemId")).toHaveLength(1);
  });

  it("limits sprays to whole numbers from 1 to 10", () => {
    for (const bad of ["0", "11", "2.5", "lots"]) {
      expect(issuesAt({ itemId: "i", ...fields, sprays: bad }, "sprays")).toHaveLength(1);
    }
    expect(issuesAt({ itemId: "i", ...fields, sprays: "10" }, "sprays")).toHaveLength(0);
  });

  it("validates occasion, mood, and visibility against their lists", () => {
    expect(issuesAt({ itemId: "i", ...fields, occasion: "PARTY" }, "occasion")).toHaveLength(1);
    expect(issuesAt({ itemId: "i", ...fields, mood: "SMUG" }, "mood")).toHaveLength(1);
    expect(issuesAt({ itemId: "i", ...fields, visibility: "FRIENDS" }, "visibility")).toHaveLength(
      1,
    );
    expect(LogWearInput.parse({ itemId: "i", ...fields, mood: "" }).mood).toBeUndefined();
  });

  it("accepts a location only as a pair, within range", () => {
    expect(
      LogWearInput.safeParse({ itemId: "i", ...fields, lat: "14.6", lon: "121" }).success,
    ).toBe(true);
    expect(issuesAt({ itemId: "i", ...fields, lat: "14.6" }, "lat")).toHaveLength(1);
    expect(issuesAt({ itemId: "i", ...fields, lat: "95", lon: "0" }, "lat")).toHaveLength(1);
  });

  it("caps notes at 1,000 characters", () => {
    expect(issuesAt({ itemId: "i", ...fields, notes: "x".repeat(1001) }, "notes")).toHaveLength(1);
  });

  it("rejects a time that is not a datetime-local value", () => {
    expect(
      issuesAt({ itemId: "i", ...fields, wornAt: "2026-10-25T20:00:00Z" }, "wornAt"),
    ).toHaveLength(1);
  });
});

describe("toWearFields", () => {
  it("reads the time in the given zone and nulls empty optionals", () => {
    const f = toWearFields(EditWearInput.parse(fields), "Asia/Manila");
    expect(f).toEqual({
      wornAt: new Date("2026-10-25T12:00:00Z"),
      sprays: 4,
      occasion: "DATE",
      mood: null,
      notes: null,
      visibility: "FOLLOWERS",
    });
  });
});

describe("isInFuture", () => {
  const now = new Date("2026-10-25T08:00:00Z");
  it("allows a few minutes of clock skew", () => {
    expect(isInFuture(new Date("2026-10-25T08:04:00Z"), now)).toBe(false);
    expect(isInFuture(new Date("2026-10-25T08:06:00Z"), now)).toBe(true);
  });
});

describe("CheckInInput", () => {
  it("accepts only real offsets and results", () => {
    expect(CheckInInput.safeParse({ wearId: "w", offsetHours: "4", result: "FAINT" }).success).toBe(
      true,
    );
    expect(CheckInInput.safeParse({ wearId: "w", offsetHours: "3", result: "FAINT" }).success).toBe(
      false,
    );
    expect(CheckInInput.safeParse({ wearId: "w", offsetHours: "2", result: "MEH" }).success).toBe(
      false,
    );
  });
});
