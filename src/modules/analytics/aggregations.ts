/**
 * Pure aggregation functions for Frag Avenue analytics.
 * No Prisma, no React, no Next. Fixture-testable.
 *
 * Definitions and invariants: see `.claude/skills/frag-domain/SKILL.md`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type MoneyByCurrency = Array<{ currency: string; amountMinor: number }>;

export type CollectionItemInput = {
  id: string;
  fragranceId: string;
  fragranceName: string;
  brandName: string;
  bottleSizeMl: number;
  purchasePriceMinor: number | null;
  currency: string | null;
  createdAt: Date;
};

export type WearInput = {
  id: string;
  wornAt: Date;
  sprays: number;
  fragranceId: string;
  fragranceName: string;
  brandName: string;
};

// ---- Money -----------------------------------------------------------------

/**
 * Sums collection value grouped by currency. Rows with either a null price or
 * a null currency are excluded — analytics never invents FX.
 * Returned array is sorted alphabetically by currency for stable display.
 */
export function sumCollectionValueByCurrency(items: CollectionItemInput[]): MoneyByCurrency {
  const map = new Map<string, number>();
  for (const i of items) {
    if (i.purchasePriceMinor === null || !i.currency) continue;
    map.set(i.currency, (map.get(i.currency) ?? 0) + i.purchasePriceMinor);
  }
  return Array.from(map.entries())
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export function sumBottleVolumeMl(items: CollectionItemInput[]): number {
  return items.reduce((s, i) => s + (i.bottleSizeMl > 0 ? i.bottleSizeMl : 0), 0);
}

// ---- Wears -----------------------------------------------------------------

export function sumSprays(wears: WearInput[]): number {
  return wears.reduce((s, w) => s + (Number.isFinite(w.sprays) ? w.sprays : 0), 0);
}

/**
 * Top-N most-worn fragrances in the input window. Ties break by lower
 * fragrance name (stable alphabetical) so the result is deterministic.
 */
export function topWornFragrances(
  wears: WearInput[],
  limit = 3,
): Array<{ fragranceId: string; name: string; brand: string; wears: number }> {
  const map = new Map<
    string,
    { fragranceId: string; name: string; brand: string; wears: number }
  >();
  for (const w of wears) {
    const existing = map.get(w.fragranceId);
    if (existing) {
      existing.wears += 1;
    } else {
      map.set(w.fragranceId, {
        fragranceId: w.fragranceId,
        name: w.fragranceName,
        brand: w.brandName,
        wears: 1,
      });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.wears - a.wears || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---- Neglect ---------------------------------------------------------------

export type LastWornInput = { fragranceId: string; lastWornAt: Date | null };

export type NeglectedFragrance = {
  fragranceId: string;
  name: string;
  brand: string;
  lastWornAt: Date | null;
  daysSinceLastWear: number | null; // null = never worn
};

/**
 * A fragrance is neglected when:
 *   1. The user has owned it (its earliest CollectionItem is) at least 90 days, AND
 *   2. Its last wear was at least 60 days ago (or it has never been worn).
 *
 * Deduped by fragranceId — owning two bottles of Aventus doesn't produce two
 * entries. Ordered by longest silence (never-worn first, then oldest wear).
 * `now` is injected so tests are deterministic.
 */
export function neglectedFragrances(
  items: CollectionItemInput[],
  lastWorn: LastWornInput[],
  now: Date,
  limit = 3,
): NeglectedFragrance[] {
  const lastWornByFrag = new Map<string, Date | null>();
  for (const l of lastWorn) {
    lastWornByFrag.set(l.fragranceId, l.lastWornAt);
  }

  // Earliest ownership date per fragrance
  const ownedSince = new Map<string, { createdAt: Date; item: CollectionItemInput }>();
  for (const item of items) {
    const prev = ownedSince.get(item.fragranceId);
    if (!prev || item.createdAt < prev.createdAt) {
      ownedSince.set(item.fragranceId, { createdAt: item.createdAt, item });
    }
  }

  const OWNED_MIN_MS = 90 * DAY_MS;
  const SILENT_MIN_MS = 60 * DAY_MS;
  const nowMs = now.getTime();

  const rows: NeglectedFragrance[] = [];
  for (const [fragranceId, { createdAt, item }] of ownedSince) {
    if (nowMs - createdAt.getTime() < OWNED_MIN_MS) continue;
    const last = lastWornByFrag.get(fragranceId) ?? null;
    if (last !== null && nowMs - last.getTime() < SILENT_MIN_MS) continue;
    rows.push({
      fragranceId,
      name: item.fragranceName,
      brand: item.brandName,
      lastWornAt: last,
      daysSinceLastWear: last === null ? null : Math.floor((nowMs - last.getTime()) / DAY_MS),
    });
  }

  return rows
    .sort((a, b) => {
      // never-worn (null) is "most neglected" → sort first
      if (a.daysSinceLastWear === null && b.daysSinceLastWear === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.daysSinceLastWear === null) return -1;
      if (b.daysSinceLastWear === null) return 1;
      return b.daysSinceLastWear - a.daysSinceLastWear;
    })
    .slice(0, limit);
}
