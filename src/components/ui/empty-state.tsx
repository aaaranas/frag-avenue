import { cn } from "@/lib/utils";

/**
 * Editorial empty state — a serif line inside a bordered frame, not a busy card.
 */
export function EmptyState({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border border-[color:var(--rule)] px-6 py-10 text-center",
        className,
      )}
    >
      {title ? (
        <p className="font-serif text-xl leading-tight text-[color:var(--fg)]">{title}</p>
      ) : null}
      <div className="mt-2 text-sm text-[color:var(--fg-muted)]">{children}</div>
    </div>
  );
}
