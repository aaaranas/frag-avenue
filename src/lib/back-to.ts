import type { Route } from "next";

/**
 * Where "Back" goes on a page that several screens link to. A fragrance's page
 * is reached from the feed, a wear, a profile, the wardrobe, stats, and the
 * catalogue; each passes `?from=<its own path>`. Only these in-app paths are
 * accepted, so the parameter can't send anyone elsewhere; anything else gets
 * the fallback. Pure.
 */

export type BackTarget = { href: Route; label: string };

const PLACES: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^\/feed$/, () => "Feed"],
  [/^\/wardrobe$/, () => "Wardrobe"],
  [/^\/stats$/, () => "Stats"],
  [/^\/wears\/[A-Za-z0-9_-]+$/, () => "Wear"],
  [/^\/u\/([a-z][a-z0-9_]{2,19})$/, (m) => `@${m[1]}`],
];

export function backTo(from: unknown, fallback: BackTarget): BackTarget {
  if (typeof from !== "string") return fallback;
  for (const [pattern, label] of PLACES) {
    const match = from.match(pattern);
    if (match) return { href: from as Route, label: label(match) };
  }
  return fallback;
}

/** A fragrance's page, remembering the screen that links to it. */
export function fragranceHref(fragranceId: string, from: string): Route {
  return `/fragrances/${fragranceId}?from=${encodeURIComponent(from)}` as Route;
}
