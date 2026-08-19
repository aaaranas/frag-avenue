import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { BottleShape } from "@/lib/bottle-appearance";
import { Bottle } from "./bottle";

const ALL: BottleShape[] = ["SQUAT", "RECTANGULAR", "FLASK", "TAPERED", "CYLINDRICAL"];

/** The y-coordinate every bottle is supposed to stand on. Mirrors BASELINE. */
const BASELINE = 160;

type Point = { x: number; y: number };

/**
 * The body path is built entirely from M/L/Q commands, all of whose arguments
 * are alternating x,y coordinates — so the raw number sequence can be read as
 * points without a real path parser.
 */
function geometry(ui: React.ReactElement) {
  const { container } = render(ui);
  const d = container.querySelector("svg > path")?.getAttribute("d");
  if (!d) throw new Error("No body path rendered");

  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  expect(nums.length % 2).toBe(0);

  const points: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) points.push({ x: nums[i]!, y: nums[i + 1]! });

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const shoulderY = Math.min(...ys);
  // Width across the shoulder, which is narrower than the base on a taper.
  const atShoulder = points.filter((p) => p.y === shoulderY).map((p) => p.x);

  return {
    container,
    points,
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: shoulderY,
    bottom: Math.max(...ys),
    baseWidth: Math.max(...xs) - Math.min(...xs),
    shoulderWidth: Math.max(...atShoulder) - Math.min(...atShoulder),
  };
}

function shape(s: BottleShape, extra: Partial<React.ComponentProps<typeof Bottle>> = {}) {
  return geometry(<Bottle color="#8a6b4a" shape={s} {...extra} />);
}

describe("Bottle silhouette", () => {
  it.each(ALL)("stands %s on the shared baseline", (s) => {
    // This is the invariant that makes a row of bottles read as a shelf: the
    // silhouettes differ in height and width, but every one bottoms out at the
    // same y so the shelf rule lines up.
    expect(shape(s).bottom).toBe(BASELINE);
  });

  it.each(ALL)("centres %s horizontally in the viewBox", (s) => {
    const { left, right } = shape(s);
    // viewBox is "0 0 100 170", so the axis of symmetry is x = 50.
    expect((left + right) / 2).toBeCloseTo(50, 5);
  });

  it.each(ALL)("keeps %s inside the viewBox", (s) => {
    const { left, right, top } = shape(s);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(100);
    expect(top).toBeGreaterThan(0);
  });

  it("narrows a TAPERED bottle toward its shoulder", () => {
    const t = shape("TAPERED");
    expect(t.shoulderWidth).toBeLessThan(t.baseWidth);
  });

  it.each(["SQUAT", "RECTANGULAR", "FLASK", "CYLINDRICAL"] as BottleShape[])(
    "keeps %s straight-sided",
    (s) => {
      const g = shape(s);
      expect(g.shoulderWidth).toBeCloseTo(g.baseWidth, 5);
    },
  );

  it("draws SQUAT as the shortest body", () => {
    // Heavier concentrations ship in small squat flacons; the SQUAT silhouette
    // is what they map to.
    const heights = ALL.map((s) => ({ s, h: BASELINE - shape(s).top }));
    const squat = heights.find((h) => h.s === "SQUAT")!;
    for (const other of heights.filter((h) => h.s !== "SQUAT")) {
      expect(squat.h).toBeLessThan(other.h);
    }
  });

  it("falls back to RECTANGULAR for an unrecognised shape", () => {
    // The type says this cannot happen; a stale database row says otherwise.
    const bogus = shape("HOURGLASS" as BottleShape);
    const rectangular = shape("RECTANGULAR");
    expect(bogus.baseWidth).toBe(rectangular.baseWidth);
    expect(bogus.bottom).toBe(BASELINE);
  });

  it("scales height with width so the illustration is not distorted", () => {
    const { container } = render(<Bottle color="#8a6b4a" size={100} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("100");
    // viewBox aspect ratio is 100:170.
    expect(svg.getAttribute("height")).toBe("170");
  });

  it("is hidden from assistive tech, since the caller supplies a text equivalent", () => {
    const { container } = shape("RECTANGULAR");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });
});

describe("Bottle colour", () => {
  it("tints the glass with the supplied colour", () => {
    const { container } = render(<Bottle color="#c07470" />);
    expect(container.querySelector("svg > path")).toHaveAttribute("fill", "#c07470");
  });

  it("uses the supplied cap colour", () => {
    const { container } = render(<Bottle color="#c07470" capColor="#c9a227" />);
    const caps = [...container.querySelectorAll("rect")].map((r) => r.getAttribute("fill"));
    expect(caps).toContain("#c9a227");
  });

  it("shows more of the glass colour as the finish gets more opaque", () => {
    const opacity = (finish: "CLEAR" | "FROSTED" | "OPAQUE") => {
      const { container } = render(<Bottle color="#c07470" finish={finish} />);
      return Number(container.querySelector("svg > path")!.getAttribute("fill-opacity"));
    };
    expect(opacity("CLEAR")).toBeLessThan(opacity("FROSTED"));
    expect(opacity("FROSTED")).toBeLessThan(opacity("OPAQUE"));
  });

  it("gives each instance its own gradient ids so two bottles cannot collide", () => {
    const { container } = render(
      <>
        <Bottle color="#c07470" shape="RECTANGULAR" />
        <Bottle color="#8fb3c8" shape="TAPERED" />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    // The liquid clip is per-instance too, or one bottle would crop the other.
    const clipIds = [...container.querySelectorAll("clipPath")].map((c) => c.id);
    expect(new Set(clipIds).size).toBe(2);
  });
});

describe("Bottle fill level", () => {
  /** Height of the washed-out "air" region above the liquid surface. */
  function washHeight(fillRatio: number | null) {
    const { container } = render(
      <Bottle color="#8a6b4a" shape="RECTANGULAR" fillRatio={fillRatio} />,
    );
    const wash = container.querySelector("g[clip-path] rect");
    return wash ? Number(wash.getAttribute("height")) : null;
  }

  it("draws no liquid line at all when the level is unknown", () => {
    // Null is not zero. An untracked bottle must not be drawn as empty, and it
    // must not be drawn as full either.
    expect(washHeight(null)).toBeNull();
  });

  it("washes out the whole body when the bottle is empty", () => {
    const empty = washHeight(0)!;
    const bodyHeight = BASELINE - shape("RECTANGULAR").top;
    expect(empty).toBeGreaterThanOrEqual(bodyHeight);
  });

  it("washes out nothing when the bottle is full", () => {
    expect(washHeight(1)).toBeCloseTo(0, 5);
  });

  it("washes out half the body at half full", () => {
    const bodyHeight = BASELINE - shape("RECTANGULAR").top;
    // +1 for the 1-unit overlap that stops a seam appearing at the shoulder.
    expect(washHeight(0.5)!).toBeCloseTo(bodyHeight / 2 + 1, 5);
  });

  it("clamps a level above full rather than overflowing the glass", () => {
    // A 105ml reading on a 100ml bottle is a measurement artefact, not a reason
    // to draw liquid above the shoulder.
    expect(washHeight(1.4)).toBeCloseTo(0, 5);
  });

  it("clamps a negative level to empty", () => {
    expect(washHeight(-0.3)).toBe(washHeight(0));
  });

  it("draws a meniscus only when there is air above the liquid", () => {
    const meniscusCount = (fillRatio: number) => {
      const { container } = render(
        <Bottle color="#8a6b4a" shape="RECTANGULAR" fillRatio={fillRatio} />,
      );
      return container.querySelectorAll("g[clip-path] rect").length;
    };
    expect(meniscusCount(0.5)).toBe(2); // wash + surface line
    expect(meniscusCount(1)).toBe(1); // full: no visible surface
    expect(meniscusCount(0)).toBe(1); // empty: no surface either
  });

  it("shows the level on an opaque bottle, but faintly", () => {
    const wash = (finish: "CLEAR" | "OPAQUE") => {
      const { container } = render(<Bottle color="#8a6b4a" finish={finish} fillRatio={0.5} />);
      return Number(container.querySelector("g[clip-path] rect")!.getAttribute("fill-opacity"));
    };
    // You can read the level through clear glass; through lacquered glass you
    // very nearly cannot, and the drawing should not pretend otherwise.
    expect(wash("OPAQUE")).toBeLessThan(wash("CLEAR"));
    expect(wash("OPAQUE")).toBeGreaterThan(0);
  });
});
