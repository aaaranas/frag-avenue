import { cn } from "@/lib/utils";

/** Initial in a circle. Decorative: the name is always printed beside it. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  // Skip a leading "@" (a username shown as the name).
  const initial = name.trim().replace(/^@/, "").charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--bg-sunken)] text-sm font-semibold text-[color:var(--fg-muted)] ring-1 ring-[color:var(--rule)]",
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** "Andrea" or "@andrea" — the best available display name. */
export function displayName(user: { name: string | null; username: string | null }): string {
  return user.name?.trim() || (user.username ? `@${user.username}` : "Someone");
}
