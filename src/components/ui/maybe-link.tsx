import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A link when there is somewhere the viewer may go, otherwise the same content
 * in a `div` — e.g. a fragrance whose page they can't open (someone else's
 * pending submission). The link is a `group`, for `group-hover:` styles inside;
 * `linkClassName` holds what only makes sense on a link (hover backgrounds).
 */
export function MaybeLink({
  href,
  className,
  linkClassName,
  decorative = false,
  children,
}: {
  href: Route | null;
  className?: string;
  linkClassName?: string;
  /**
   * A second link to the same place, such as a photo beside its name: kept out
   * of the tab order and from screen readers, which get the name's link.
   */
  decorative?: boolean;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link
      href={href}
      className={cn("group", className, linkClassName)}
      {...(decorative ? { tabIndex: -1, "aria-hidden": true } : {})}
    >
      {children}
    </Link>
  );
}
