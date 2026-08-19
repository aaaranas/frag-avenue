import { Badge } from "./badge";
import { cn } from "@/lib/utils";

/**
 * Accord tag. A thin wrapper over the shadcn Badge so the existing call sites
 * keep their name, but the appearance comes from one place.
 *
 * Filled with the brand wash rather than outlined — a row of hairline-outlined
 * pills disappeared into the page rules around them.
 */
export function Chip({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <Badge
      title={title}
      variant="secondary"
      className={cn(
        "border-[color:var(--brand-line)] bg-[color:var(--brand-wash)] px-2.5 py-1 font-normal text-[color:var(--accent-foreground)] capitalize",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
