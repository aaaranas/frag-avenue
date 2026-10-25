"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, FlaskConical, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFILE, TABS, isActive, type NavItem, type TabId } from "./nav-items";

type Icon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const ICONS: Record<TabId | "profile", Icon> = {
  feed: Activity,
  wardrobe: FlaskConical,
  log: Plus,
  stats: BarChart3,
  clubs: Users,
  profile: User,
};

/**
 * Mobile: a top app bar (wordmark + profile) and a five-tab bottom bar with
 * Log as the centre "+" action. Desktop: a sidebar with the same items.
 *
 * The current tab carries aria-current="page" and the accent colour plus a
 * bar, so it is never signalled by colour alone. Every target is ≥ 44px.
 *
 * While a tapped tab's page loads, its bar pulses (`useLinkStatus`). This is
 * the navigation loading state: route-level `loading.tsx` skeletons were tried
 * and dropped, because streaming the page behind a Suspense boundary lost taps
 * made while it hydrated.
 */
export function PrimaryNav() {
  const path = usePathname() ?? "/";

  return (
    <>
      {/* Mobile top bar */}
      <header className="pt-safe sticky top-0 z-40 flex items-center justify-between border-b border-[color:var(--rule)] bg-[color:var(--bg)]/95 pr-1 pl-4 backdrop-blur md:hidden">
        <Link
          href="/feed"
          className="flex min-h-11 items-center text-base font-semibold tracking-tight"
        >
          Frag Avenue
        </Link>
        <ProfileLink path={path} compact />
      </header>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Primary"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--rule)] bg-[color:var(--bg)]/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {TABS.map((item) => (
            <li key={item.id} className="flex">
              <MobileTab item={item} active={isActive(item, path)} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop sidebar */}
      <nav
        aria-label="Primary"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-[color:var(--rule)] p-6 md:flex"
      >
        <Link
          href="/feed"
          className="mb-10 flex min-h-11 items-center text-lg font-semibold tracking-tight"
        >
          Frag Avenue
        </Link>
        <ul className="flex flex-col gap-1">
          {TABS.map((item) => (
            <li key={item.id}>
              <SidebarItem item={item} active={isActive(item, path)} />
            </li>
          ))}
        </ul>
        <div className="mt-auto border-t border-[color:var(--rule)] pt-4">
          <ProfileLink path={path} />
        </div>
      </nav>
    </>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.id];

  if (item.id === "log") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label="Log a wear"
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
      >
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-full bg-[color:var(--accent-color)] text-[color:var(--accent-fg)] shadow-sm",
            active &&
              "ring-2 ring-[color:var(--accent-color)] ring-offset-2 ring-offset-[color:var(--bg)]",
          )}
        >
          <Icon className="size-6" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
        active
          ? "text-[color:var(--accent-color)]"
          : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b bg-[color:var(--accent-color)]"
        />
      ) : null}
      <PendingBar className="top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b" />
      <Icon className="size-5" aria-hidden />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.id];

  if (item.id === "log") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "my-2 flex min-h-11 items-center gap-3 rounded-md bg-[color:var(--accent-color)] px-3 text-sm font-medium text-[color:var(--accent-fg)]",
          active &&
            "ring-2 ring-[color:var(--accent-color)] ring-offset-2 ring-offset-[color:var(--bg)]",
        )}
      >
        <Icon className="size-4" aria-hidden />
        Log a wear
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-[color:var(--bg-sunken)] font-medium text-[color:var(--fg)]"
          : "text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-sunken)] hover:text-[color:var(--fg)]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[color:var(--accent-color)]"
        />
      ) : null}
      <PendingBar className="top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r" />
      <Icon
        className={cn(
          "size-4",
          active ? "text-[color:var(--accent-color)]" : "text-[color:var(--fg-faint)]",
        )}
        aria-hidden
      />
      {item.label}
    </Link>
  );
}

function ProfileLink({ path, compact = false }: { path: string; compact?: boolean }) {
  const active = isActive(PROFILE, path);
  return (
    <Link
      href={PROFILE.href}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? "Profile" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md text-sm transition-colors",
        compact ? "min-w-11 justify-center" : "px-3",
        active
          ? "font-medium text-[color:var(--accent-color)]"
          : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
      )}
    >
      <User className={compact ? "size-5" : "size-4"} aria-hidden />
      {compact ? null : PROFILE.label}
    </Link>
  );
}

/** The tab's indicator bar, pulsing while the link it sits in is navigating. */
function PendingBar({ className }: { className: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className={cn("absolute animate-pulse bg-[color:var(--accent-color)]", className)}
    />
  );
}
