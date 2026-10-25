import { describe, it, expect } from "vitest";
import {
  accordBreakdown,
  challengeProgress,
  currentStreak,
  isOwned,
  mostWorn,
  pickForToday,
  uniqueScents,
  untouchedItems,
  type DatedWear,
  type ItemKind,
} from "./wear-stats";
import { localDate } from "@/lib/time-zone";

const TODAY = "2026-10-25";

const wear = (localDate: string, fragranceId = "f1", brandId = "b1"): DatedWear => ({
  localDate,
  fragranceId,
  brandId,
});

describe("isOwned", () => {
  it("treats everything but wishlist as owned", () => {
    expect(isOwned("BOTTLE")).toBe(true);
    expect(isOwned("DECANT")).toBe(true);
    expect(isOwned("SAMPLE")).toBe(true);
    expect(isOwned("WISHLIST")).toBe(false);
  });
});

describe("currentStreak", () => {
  it("is 0 with no wears", () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-10-23", "2026-10-24", "2026-10-25"], TODAY)).toBe(3);
  });

  it("stays alive when the last wear was yesterday", () => {
    expect(currentStreak(["2026-10-22", "2026-10-23", "2026-10-24"], TODAY)).toBe(3);
  });

  it("is 0 when the last wear was two days ago", () => {
    expect(currentStreak(["2026-10-21", "2026-10-22", "2026-10-23"], TODAY)).toBe(0);
  });

  it("stops at the first gap", () => {
    expect(
      currentStreak(["2026-10-20", "2026-10-21", "2026-10-23", "2026-10-24", "2026-10-25"], TODAY),
    ).toBe(3);
  });

  it("counts several wears on one day once, in any order", () => {
    expect(currentStreak(["2026-10-25", "2026-10-24", "2026-10-25", "2026-10-24"], TODAY)).toBe(2);
  });

  it("ignores dates after today", () => {
    expect(currentStreak(["2026-10-26", "2026-10-25"], TODAY)).toBe(1);
    expect(currentStreak(["2026-10-26"], TODAY)).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(currentStreak(["2025-12-30", "2025-12-31", "2026-01-01"], "2026-01-01")).toBe(3);
    expect(currentStreak(["2026-02-28", "2026-03-01"], "2026-03-01")).toBe(2);
  });

  it("uses local days: two wears 20h apart in UTC can be consecutive local days", () => {
    // Manila (+8). 2026-10-23 23:00 local and 2026-10-24 19:00 local.
    const tz = "Asia/Manila";
    const dates = [new Date("2026-10-23T15:00:00Z"), new Date("2026-10-24T11:00:00Z")].map((d) =>
      localDate(d, tz),
    );
    expect(dates).toEqual(["2026-10-23", "2026-10-24"]);
    expect(currentStreak(dates, "2026-10-24")).toBe(2);
  });

  it("is unaffected by a DST transition in the middle of the run", () => {
    // New York falls back on 2026-11-01. Wear at 20:00 local each evening.
    const tz = "America/New_York";
    const instants = ["2026-10-31T00:00:00Z", "2026-11-01T00:00:00Z", "2026-11-02T01:00:00Z"];
    const dates = instants.map((i) => localDate(new Date(i), tz));
    expect(dates).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(currentStreak(dates, "2026-11-01")).toBe(3);
  });
});

describe("uniqueScents / mostWorn", () => {
  const wears = [
    wear("2026-10-01", "a"),
    wear("2026-10-02", "b"),
    wear("2026-10-03", "a"),
    wear("2026-10-04", "c"),
    wear("2026-10-05", "b"),
  ];

  it("counts distinct fragrances", () => {
    expect(uniqueScents(wears)).toBe(3);
    expect(uniqueScents([])).toBe(0);
  });

  it("ranks by wear count, breaking ties by most recent wear", () => {
    expect(mostWorn(wears, 3)).toEqual([
      { fragranceId: "b", wears: 2, lastWorn: "2026-10-05" },
      { fragranceId: "a", wears: 2, lastWorn: "2026-10-03" },
      { fragranceId: "c", wears: 1, lastWorn: "2026-10-04" },
    ]);
    expect(mostWorn([], 1)).toEqual([]);
  });
});

describe("accordBreakdown", () => {
  const accords = new Map([
    [
      "a",
      [
        { name: "woody", strength: 3 },
        { name: "fresh", strength: 1 },
      ],
    ],
    ["b", [{ name: "fresh", strength: 5 }]],
  ]);

  it("gives each wear a total weight of 1, split by accord strength", () => {
    // a: woody .75, fresh .25 ; b: fresh 1 ; two wears → woody .375, fresh .625
    const result = accordBreakdown([wear(TODAY, "a"), wear(TODAY, "b")], accords);
    expect(result.map((r) => r.accord)).toEqual(["fresh", "woody"]);
    expect(result[0]!.share).toBeCloseTo(0.625);
    expect(result[1]!.share).toBeCloseTo(0.375);
    expect(result.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it("leaves wears of unclassified fragrances out of the denominator", () => {
    const result = accordBreakdown([wear(TODAY, "b"), wear(TODAY, "unknown")], accords);
    expect(result).toEqual([{ accord: "fresh", share: 1 }]);
  });

  it("is empty with no classifiable wears", () => {
    expect(accordBreakdown([], accords)).toEqual([]);
    expect(accordBreakdown([wear(TODAY, "unknown")], accords)).toEqual([]);
  });
});

describe("untouchedItems", () => {
  const item = (id: string, kind: ItemKind = "BOTTLE") => ({ id, kind });

  it("returns owned items never worn or last worn 30+ days ago", () => {
    const items = [
      item("never"),
      item("old"),
      item("edge"),
      item("recent"),
      item("wish", "WISHLIST"),
    ];
    const last = new Map([
      ["old", "2026-08-01"],
      ["edge", "2026-09-25"], // exactly 30 days before Oct 25
      ["recent", "2026-09-26"], // 29 days
    ]);
    const result = untouchedItems(items, last, TODAY);
    expect(result.map((r) => r.item.id)).toEqual(["never", "old", "edge"]);
    expect(result[0]).toMatchObject({ lastWorn: null, daysSince: null });
    expect(result[1]).toMatchObject({ lastWorn: "2026-08-01", daysSince: 85 });
    expect(result[2]).toMatchObject({ daysSince: 30 });
  });

  it("never includes wishlist items, even unworn", () => {
    expect(untouchedItems([item("w", "WISHLIST")], new Map(), TODAY)).toEqual([]);
  });

  it("includes decants and samples", () => {
    const result = untouchedItems([item("d", "DECANT"), item("s", "SAMPLE")], new Map(), TODAY);
    expect(result.map((r) => r.item.id)).toEqual(["d", "s"]);
  });

  it("honours a custom threshold", () => {
    const result = untouchedItems([item("x")], new Map([["x", "2026-10-15"]]), TODAY, 7);
    expect(result).toHaveLength(1);
  });
});

describe("pickForToday", () => {
  const item = (
    id: string,
    opts: { kind?: ItemKind; createdAt?: string; remainingMl?: number | null } = {},
  ) => ({
    id,
    kind: opts.kind ?? ("BOTTLE" as ItemKind),
    createdAt: new Date(opts.createdAt ?? "2026-01-01T00:00:00Z"),
    remainingMl: opts.remainingMl ?? null,
  });

  it("is null with nothing owned", () => {
    expect(pickForToday([], new Map())).toBeNull();
    expect(pickForToday([item("w", { kind: "WISHLIST" })], new Map())).toBeNull();
  });

  it("prefers never-worn items, oldest-added first", () => {
    const items = [
      item("worn"),
      item("newer", { createdAt: "2026-06-01T00:00:00Z" }),
      item("older", { createdAt: "2026-02-01T00:00:00Z" }),
    ];
    const last = new Map([["worn", new Date("2026-03-01T00:00:00Z")]]);
    expect(pickForToday(items, last)?.id).toBe("older");
  });

  it("otherwise picks the least recently worn", () => {
    const items = [item("a"), item("b"), item("c")];
    const last = new Map([
      ["a", new Date("2026-10-20T08:00:00Z")],
      ["b", new Date("2026-10-20T07:00:00Z")], // same day as a, but earlier
      ["c", new Date("2026-10-24T00:00:00Z")],
    ]);
    expect(pickForToday(items, last)?.id).toBe("b");
  });

  it("skips empty bottles but not ones with unknown fill", () => {
    const items = [item("empty", { remainingMl: 0 }), item("unknown", { remainingMl: null })];
    const last = new Map([["unknown", new Date("2026-10-24T00:00:00Z")]]);
    expect(pickForToday(items, last)?.id).toBe("unknown");
  });

  it("is deterministic on full ties", () => {
    expect(pickForToday([item("b"), item("a")], new Map())?.id).toBe("a");
  });
});

describe("challengeProgress", () => {
  const wears = [
    wear("2026-09-25", "outside", "h0"), // 31st day back — outside the window
    wear("2026-09-26", "f1", "h1"), // first day of the window
    wear("2026-10-10", "f2", "h1"),
    wear("2026-10-10", "f2", "h1"), // repeat
    wear("2026-10-25", "f3", "h2"), // today
    wear("2026-10-26", "future", "h9"), // after today — ignored
  ];

  it("counts distinct fragrances in the 30 days ending today", () => {
    expect(challengeProgress(wears, "UNIQUE_FRAGRANCES", TODAY)).toBe(3);
  });

  it("counts distinct houses", () => {
    expect(challengeProgress(wears, "UNIQUE_HOUSES", TODAY)).toBe(2);
  });

  it("is 0 with no wears and honours custom windows", () => {
    expect(challengeProgress([], "UNIQUE_FRAGRANCES", TODAY)).toBe(0);
    expect(challengeProgress(wears, "UNIQUE_FRAGRANCES", TODAY, 1)).toBe(1);
  });
});
