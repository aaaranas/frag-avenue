import { describe, expect, it } from "vitest";
import { challengeLeaderboard, challengeStatus, type ChallengeDef } from "./challenges";
import type { DatedWear } from "./wear-stats";

const TODAY = "2026-10-25";
const scents: ChallengeDef = {
  id: "c1",
  title: "30 scents",
  kind: "UNIQUE_FRAGRANCES",
  target: 30,
  windowDays: 30,
};
const houses: ChallengeDef = {
  id: "c2",
  title: "5 houses",
  kind: "UNIQUE_HOUSES",
  target: 5,
  windowDays: 30,
};
const w = (localDate: string, fragranceId: string, brandId = `b_${fragranceId}`): DatedWear => ({
  localDate,
  fragranceId,
  brandId,
});

describe("challengeStatus", () => {
  it("counts distinct fragrances in the window and reports progress", () => {
    const s = challengeStatus(
      scents,
      [w(TODAY, "a"), w(TODAY, "a"), w("2026-10-01", "b"), w("2026-09-01", "c")],
      TODAY,
    );
    expect(s).toEqual({ count: 2, target: 30, complete: false, fraction: 2 / 30 });
  });

  it("counts houses, completes at the target, and caps the fraction", () => {
    const wears = ["a", "b", "c", "d", "e", "f"].map((id) => w(TODAY, id));
    expect(challengeStatus(houses, wears, TODAY)).toEqual({
      count: 6,
      target: 5,
      complete: true,
      fraction: 1,
    });
  });

  it("counts two fragrances from one house as one house", () => {
    expect(
      challengeStatus(houses, [w(TODAY, "a", "creed"), w(TODAY, "b", "creed")], TODAY).count,
    ).toBe(1);
  });
});

describe("challengeLeaderboard", () => {
  it("ranks by progress, sharing ranks on ties, each with their own today", () => {
    const board = challengeLeaderboard(scents, [
      { userId: "carol", today: TODAY, wears: [w(TODAY, "a")] },
      { userId: "alice", today: TODAY, wears: [w(TODAY, "a"), w(TODAY, "b")] },
      { userId: "bob", today: TODAY, wears: [w(TODAY, "x"), w(TODAY, "y")] },
      // Dave's wear is 31 days before his today: outside his window.
      { userId: "dave", today: TODAY, wears: [w("2026-09-24", "z")] },
    ]);
    expect(board.map((r) => [r.userId, r.count, r.rank])).toEqual([
      ["alice", 2, 1],
      ["bob", 2, 1],
      ["carol", 1, 3],
      ["dave", 0, 4],
    ]);
  });

  it("is empty for no participants", () => {
    expect(challengeLeaderboard(houses, [])).toEqual([]);
  });
});
