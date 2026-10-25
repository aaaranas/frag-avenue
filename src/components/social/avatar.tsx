import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * The person's photo (from Google, when they signed in with it), else their
 * initial. Decorative: the name is always printed beside it.
 */
export function Avatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  // Skip a leading "@" (a username shown as the name).
  const initial = name.trim().replace(/^@/, "").charAt(0).toUpperCase() || "?";
  return (
    <AvatarRoot aria-hidden className={cn("size-10 ring-1 ring-[color:var(--rule)]", className)}>
      {image ? (
        // Google's photo host refuses requests that carry a referrer.
        <AvatarImage src={image} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className="bg-[color:var(--bg-sunken)] font-semibold text-[color:var(--fg-muted)]">
        {initial}
      </AvatarFallback>
    </AvatarRoot>
  );
}

/** "Andrea" or "@andrea" — the best available display name. */
export function displayName(user: { name: string | null; username: string | null }): string {
  return user.name?.trim() || (user.username ? `@${user.username}` : "Someone");
}
