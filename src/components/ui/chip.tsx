import { cn } from "@/lib/utils";

/**
 * Chip — used for accord tags, filter pills, small labels.
 * Restrained: no filled backgrounds, just a hairline border.
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
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-sm border border-[color:var(--rule-strong)] px-2.5 py-1 text-xs tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}
