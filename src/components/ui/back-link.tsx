import type { Route } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "‹ Wardrobe" above a detail screen: where Back goes, as a real link with a
 * 44px target. Pulled left by its padding so the chevron lines up with the
 * content edge.
 */
export function BackLink<T extends string>({
  href,
  children,
  className,
}: {
  href: Route<T>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-md pr-3 pl-1 text-sm font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden />
      {children}
    </Link>
  );
}
