import { describe, expect, it } from "vitest";
import {
  SHAPE_LABEL,
  bottleAppearance,
  fillLabel,
  fillRatio,
  type FragranceAppearanceInput,
} from "./bottle-appearance";

const WOODY = [{ name: "woody", strength: 5 }];

function input(overrides: Partial<FragranceAppearanceInput> = {}): FragranceAppearanceInput {
  return { concentration: "EDP", accords: WOODY, ...overrides };
}

describe("bottleAppearance — curated data wins", () => {
  it("uses the curated shape, colours and finish when all are present", () => {
    const a = bottleAppearance(
      input({
        bottleShape: "FLASK",
        glassColor: "#3F4448",
        capColor: "#17171A",
        glassFinish: "OPAQUE",
      }),
    );

    expect(a).toMatchObject({
      shape: "FLASK",
      color: "#3f4448",
      capColor: "#17171a",
      finish: "OPAQUE",
      curatedShape: true,
    });
  });

  it("normalises curated hex to lower case so two spellings render identically", () => {
    expect(bottleAppearance(input({ glassColor: "#ABCDEF" })).color).toBe("#abcdef");
  });
});

describe("bottleAppearance — derived fallback", () => {
  it("infers the silhouette from the concentration when no shape is curated", () => {
    // Curation will never be complete, so this is the normal path for most of
    // the catalogue rather than a degraded mode.
    expect(bottleAppearance(input({ concentration: "EDP" })).shape).toBe("RECTANGULAR");
    expect(bottleAppearance(input({ concentration: "EDT" })).shape).toBe("TAPERED");
    expect(bottleAppearance(input({ concentration: "EXTRAIT" })).shape).toBe("SQUAT");
    expect(bottleAppearance(input({ concentration: "PARFUM" })).shape).toBe("SQUAT");
    expect(bottleAppearance(input({ concentration: "COLOGNE" })).shape).toBe("CYLINDRICAL");
  });

  it("reports an inferred silhouette as not curated", () => {
    expect(bottleAppearance(input()).curatedShape).toBe(false);
  });

  it("falls back to the strongest accord for the glass colour", () => {
    const a = bottleAppearance(
      input({
        accords: [
          { name: "aquatic", strength: 5 },
          { name: "woody", strength: 2 },
        ],
      }),
    );
    expect(a.color).toBe("#8fb3c8");
  });

  it("falls back per field, so a curated shape still gets an accord colour", () => {
    const a = bottleAppearance(input({ bottleShape: "CYLINDRICAL", accords: WOODY }));
    expect(a.shape).toBe("CYLINDRICAL");
    expect(a.color).toBe("#8a6b4a");
    expect(a.curatedShape).toBe(true);
  });

  it("defaults an uncurated bottle to a clear finish and a dark cap", () => {
    const a = bottleAppearance(input());
    expect(a.finish).toBe("CLEAR");
    expect(a.capColor).toBe("#1e1c17");
  });

  it("survives a fragrance with no accords at all", () => {
    expect(bottleAppearance(input({ accords: [] })).color).toBe("#a89680");
  });
});

describe("bottleAppearance — bad curated data", () => {
  // These values come out of a database column, so a typo or a legacy format
  // can reach the renderer. Emitting it into SVG would produce a broken bottle.
  it.each(["red", "#fff", "#12345g", "", "  ", "rgb(1,2,3)", "#1234567"])(
    "ignores the invalid colour %o and falls back",
    (bad) => {
      expect(bottleAppearance(input({ glassColor: bad })).color).toBe("#8a6b4a");
    },
  );

  it("ignores an invalid cap colour", () => {
    expect(bottleAppearance(input({ capColor: "black" })).capColor).toBe("#1e1c17");
  });

  it("accepts a hex with surrounding whitespace", () => {
    expect(bottleAppearance(input({ glassColor: "  #abcdef  " })).color).toBe("#abcdef");
  });

  it("treats null and undefined curation identically", () => {
    const withNulls = bottleAppearance(
      input({ bottleShape: null, glassColor: null, capColor: null, glassFinish: null }),
    );
    expect(withNulls).toEqual(bottleAppearance(input()));
  });
});

describe("fillRatio", () => {
  it("computes the proportion remaining", () => {
    expect(fillRatio(100, 62)).toBeCloseTo(0.62, 10);
    expect(fillRatio(125, 96)).toBeCloseTo(0.768, 10);
  });

  it("returns null when the remaining volume was never recorded", () => {
    // Not zero. "I don't track this" and "this bottle is empty" are different
    // statements and must not render the same.
    expect(fillRatio(100, null)).toBeNull();
  });

  it("reports an empty bottle as 0, which is a real state", () => {
    expect(fillRatio(100, 0)).toBe(0);
  });

  it("clamps a reading above the bottle size", () => {
    // 105 ml in a 100 ml bottle is a measurement artefact, not a reason to
    // blank the illustration.
    expect(fillRatio(100, 105)).toBe(1);
  });

  it("clamps a negative reading", () => {
    expect(fillRatio(100, -5)).toBe(0);
  });

  it("returns null for a nonsensical bottle size rather than dividing by zero", () => {
    expect(fillRatio(0, 50)).toBeNull();
    expect(fillRatio(-100, 50)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(fillRatio(100, Number.NaN)).toBeNull();
    expect(fillRatio(Number.NaN, 50)).toBeNull();
  });
});

describe("fillLabel", () => {
  it("says nothing when the level is unknown", () => {
    expect(fillLabel(null)).toBeNull();
  });

  it.each([
    [0, "Empty"],
    [0.05, "Almost empty"],
    [0.3, "Running low"],
    [0.62, "Part used"],
    [0.95, "Full"],
    [1, "Full"],
  ])("describes %s as %s", (ratio, expected) => {
    expect(fillLabel(ratio)).toBe(expected);
  });

  it("distinguishes empty from almost empty at the boundary", () => {
    expect(fillLabel(0)).toBe("Empty");
    expect(fillLabel(0.001)).toBe("Almost empty");
  });
});

describe("SHAPE_LABEL", () => {
  it("names every shape, since these strings are the non-visual equivalent", () => {
    const shapes = ["RECTANGULAR", "FLASK", "CYLINDRICAL", "TAPERED", "SQUAT"] as const;
    for (const s of shapes) {
      expect(SHAPE_LABEL[s]).toMatch(/\w/);
    }
  });
});
