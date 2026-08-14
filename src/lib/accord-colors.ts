/**
 * Deterministic accord → glass color mapping.
 * Pure. No React. The color of a bottle IS data — a fresh scent looks pale
 * aquatic, a gourmand looks caramel. Not decoration.
 */

const ACCORD_COLORS: Record<string, string> = {
  // Fresh family — pale cool tones
  aquatic: "#8fb3c8",
  fresh: "#a8c2ab",
  "fresh-spicy": "#8fa585",
  citrus: "#d9c26a",

  // Woody / aromatic — sage, olive, warm brown
  aromatic: "#7d8d70",
  woody: "#8a6b4a",
  spicy: "#a86a3f",
  "fresh-woody": "#a08f6a",

  // Amber / warm — ambers, caramels
  amber: "#bc8c53",
  "warm-spicy": "#9c5432",
  sweet: "#c8996a",
  gourmand: "#a07048",
  tobacco: "#553a25",
  smoky: "#6b5c48",

  // Musk / floral / fruit — cream, coral, rose
  musky: "#c9baa0",
  fruity: "#c07470",
  floral: "#c39ab0",

  // Fallback
  default: "#a89680",
};

export function accordColor(name: string): string {
  const key = name.trim().toLowerCase();
  return ACCORD_COLORS[key] ?? ACCORD_COLORS.default!;
}

/**
 * Pick the color of the strongest accord as the bottle's glass tint.
 * Ties break alphabetically for determinism.
 */
export function primaryAccordColor(accords: Array<{ name: string; strength: number }>): string {
  if (accords.length === 0) return ACCORD_COLORS.default!;
  const sorted = [...accords].sort(
    (a, b) => b.strength - a.strength || a.name.localeCompare(b.name),
  );
  return accordColor(sorted[0]!.name);
}
