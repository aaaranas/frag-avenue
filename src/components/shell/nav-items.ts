/**
 * The five primary tabs, plus Profile (top bar on mobile, sidebar footer on
 * desktop). Pure data + matching so it can be tested without rendering.
 *
 * `matches` also claims the legacy routes a tab replaces, so the right tab is
 * current while a tab still forwards to its legacy page (Phase 2 → 6).
 */
export type TabId = "feed" | "wardrobe" | "log" | "stats" | "clubs";

export type NavItem = {
  id: TabId | "profile";
  href: "/feed" | "/wardrobe" | "/log" | "/stats" | "/clubs" | "/profile";
  label: string;
  prefixes: readonly string[];
};

export const TABS: readonly NavItem[] = [
  { id: "feed", href: "/feed", label: "Feed", prefixes: ["/feed", "/dashboard", "/advisor"] },
  {
    id: "wardrobe",
    href: "/wardrobe",
    label: "Wardrobe",
    prefixes: ["/wardrobe", "/collection", "/fragrances"],
  },
  { id: "log", href: "/log", label: "Log", prefixes: ["/log", "/wear"] },
  { id: "stats", href: "/stats", label: "Stats", prefixes: ["/stats", "/insights"] },
  { id: "clubs", href: "/clubs", label: "Clubs", prefixes: ["/clubs"] },
];

export const PROFILE: NavItem = {
  id: "profile",
  href: "/profile",
  label: "Profile",
  prefixes: ["/profile"],
};

/** True when `path` is the item's route or below it (segment-aware). */
export function isActive(item: NavItem, path: string): boolean {
  return item.prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}
