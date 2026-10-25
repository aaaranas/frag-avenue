/**
 * Pure presentation logic for wardrobe items. No Prisma, no React.
 */
import { costPerWearMinor } from "@/modules/analytics";
import type { ItemKind } from "./schema";

/**
 * Cost per wear in minor units: price ÷ wears. Null (shown as "—") for a
 * wishlist entry (not owned), an item without a price, or one never worn.
 */
export function itemCostPerWearMinor(
  kind: ItemKind,
  priceMinor: number | null,
  wears: number,
): number | null {
  if (kind === "WISHLIST" || priceMinor === null) return null;
  return costPerWearMinor(priceMinor, wears);
}

/** 0..1, or null when the size or the remaining amount is unknown. */
export function fillRatio(sizeMl: number | null, remainingMl: number | null): number | null {
  if (sizeMl === null || remainingMl === null || sizeMl <= 0) return null;
  return Math.min(1, Math.max(0, remainingMl / sizeMl));
}

/** "62% full", "Empty", "Full", or null when unknown. Rounds, but never to 0% or 100% falsely. */
export function fillLabel(ratio: number | null): string | null {
  if (ratio === null) return null;
  if (ratio === 0) return "Empty";
  if (ratio === 1) return "Full";
  const pct = Math.min(99, Math.max(1, Math.round(ratio * 100)));
  return `${pct}% full`;
}

/** "1 wear" / "12 wears". */
export function wearCountLabel(wears: number): string {
  return `${wears} ${wears === 1 ? "wear" : "wears"}`;
}
