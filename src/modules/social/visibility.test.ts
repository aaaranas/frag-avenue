import { describe, expect, it } from "vitest";
import {
  canViewWear,
  feedWhere,
  profileWearsWhere,
  visibleWearsWhere,
  type Visibility,
} from "./visibility";

const OWNER = "owner";
const VIEWER = "viewer";

describe("canViewWear", () => {
  const cases: Array<[Visibility, boolean, boolean]> = [
    // visibility, viewer follows owner, can view
    ["PUBLIC", false, true],
    ["PUBLIC", true, true],
    ["FOLLOWERS", false, false],
    ["FOLLOWERS", true, true],
    ["PRIVATE", false, false],
    ["PRIVATE", true, false],
  ];
  for (const [visibility, follows, expected] of cases) {
    it(`${visibility} wear, ${follows ? "follower" : "non-follower"} → ${expected ? "visible" : "hidden"}`, () => {
      expect(canViewWear({ userId: OWNER, visibility }, VIEWER, follows)).toBe(expected);
    });
  }

  it("always shows owners their own wears, private included", () => {
    expect(canViewWear({ userId: OWNER, visibility: "PRIVATE" }, OWNER, false)).toBe(true);
  });
});

describe("where builders", () => {
  it("visibleWearsWhere encodes the same three grants", () => {
    expect(visibleWearsWhere(VIEWER)).toEqual({
      OR: [
        { userId: VIEWER },
        { visibility: "PUBLIC" },
        { visibility: "FOLLOWERS", user: { followers: { some: { followerId: VIEWER } } } },
      ],
    });
  });

  it("feedWhere limits visible wears to the viewer and people they follow", () => {
    expect(feedWhere(VIEWER)).toEqual({
      AND: [
        visibleWearsWhere(VIEWER),
        { OR: [{ userId: VIEWER }, { user: { followers: { some: { followerId: VIEWER } } } }] },
      ],
    });
  });

  it("profileWearsWhere is one owner's wears, filtered by what the viewer may see", () => {
    expect(profileWearsWhere(OWNER, VIEWER)).toEqual({
      AND: [{ userId: OWNER }, visibleWearsWhere(VIEWER)],
    });
  });

  it("never mentions PRIVATE as a grant", () => {
    expect(JSON.stringify([visibleWearsWhere(VIEWER), feedWhere(VIEWER)])).not.toContain("PRIVATE");
  });
});
