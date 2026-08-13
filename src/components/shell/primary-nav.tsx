"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, Plus, LineChart, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  matches: (path: string) => boolean;
  primary?: boolean;
};

const ITEMS: Item[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    matches: (p) => p === "/dashboard" || p === "/advisor",
  },
  {
    href: "/collection",
    label: "Collection",
    icon: FlaskConical,
    matches: (p) => p.startsWith("/collection") || p.startsWith("/fragrances"),
  },
  {
    href: "/wear/new",
    label: "Log wear",
    icon: Plus,
    matches: (p) => p.startsWith("/wear"),
    primary: true,
  },
  {
    href: "/insights",
    label: "Insights",
    icon: LineChart,
    matches: (p) => p.startsWith("/insights"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    matches: (p) => p.startsWith("/profile"),
  },
];

/**
 * Responsive primary navigation. Client component because active state depends
 * on the current path (usePathname). Mobile: bottom tab bar with a small serif
 * wordmark absent — this is the app, not the marketing site. Desktop: quiet
 * sidebar with a wordmark and rule-marked active item.
 */
export function PrimaryNav() {
  const path = usePathname() ?? "/";

  return (
    <>
      {/* Mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--rule)] bg-[color:var(--bg)]/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map((item) => {
            const active = item.matches(path);
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[10px] tracking-[0.14em] uppercase transition-colors",
                    active
                      ? "text-[color:var(--fg)]"
                      : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]",
                    item.primary && !active && "text-[color:var(--color-accent)]",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 bg-[color:var(--fg)]"
                    />
                  ) : null}
                  <item.icon className="h-5 w-5" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop sidebar */}
      <nav
        aria-label="Primary"
        className="hidden w-60 shrink-0 border-r border-[color:var(--rule)] p-8 md:flex md:flex-col"
      >
        <Link href="/dashboard" className="mb-12 block">
          <span className="eyebrow">Frag Avenue</span>
          <span className="mt-1 block font-serif text-2xl leading-none italic">Wardrobe</span>
        </Link>

        <ul className="flex flex-col gap-0.5">
          {ITEMS.map((item) => {
            const active = item.matches(path);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 px-2 py-2 text-sm transition-colors",
                    active
                      ? "text-[color:var(--fg)]"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 -left-8 h-4 w-[2px] -translate-y-1/2 bg-[color:var(--color-accent)]"
                    />
                  ) : null}
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-[color:var(--fg)]"
                        : "text-[color:var(--fg-faint)] group-hover:text-[color:var(--fg-muted)]",
                    )}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-8">
          <p className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
            Foundation build
          </p>
        </div>
      </nav>
    </>
  );
}
