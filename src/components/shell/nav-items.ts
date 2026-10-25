/**
 * The five primary tabs, plus Profile (top bar on mobile, sidebar footer on
 * desktop). Pure data + matching so it can be tested without rendering.
 *
 * `prefixes` also claims the screens a tab owns below its own route (a
 * profile under Feed, the catalogue under Wardrobe), so the tab stays current.
 */
export type TabId = "feed" | "wardrobe" | "log" | "stats" | "clubs";

export type NavItem = {
  id: TabId | "profile";
  href: "/feed" | "/wardrobe" | "/log" | "/stats" | "/clubs" | "/profile";
  label: string;
  prefixes: readonly string[];
};

export const TABS: readonly NavItem[] = [
  { id: "feed", href: "/feed", label: "Feed", prefixes: ["/feed", "/u", "/people"] },
  {
    id: "wardrobe",
    href: "/wardrobe",
    label: "Wardrobe",
    prefixes: ["/wardrobe", "/fragrances"],
  },
  { id: "log", href: "/log", label: "Log", prefixes: ["/log", "/wears"] },
  { id: "stats", href: "/stats", label: "Stats", prefixes: ["/stats"] },
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
