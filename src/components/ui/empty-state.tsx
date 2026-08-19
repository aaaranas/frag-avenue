import { cn } from "@/lib/utils";

/**
 * Empty state — a serif line on a sunken panel. Sits on the muted surface rather
 * than an outlined box so it reads as "nothing here yet" rather than as a card
 * whose contents failed to load.
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
        "rounded-lg border border-[color:var(--rule)] bg-[color:var(--bg-sunken)] px-6 py-12 text-center",
        className,
      )}
    >
      {title ? (
        <p className="font-serif text-2xl leading-tight text-[color:var(--fg)]">{title}</p>
      ) : null}
      <div className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {children}
      </div>
    </div>
  );
}
