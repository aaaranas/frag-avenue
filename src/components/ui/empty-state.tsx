import { cn } from "@/lib/utils";

/**
 * Empty state: what is missing and what to do about it. A dashed outline
 * reads as "a space waiting for something" rather than a card whose contents
 * failed to load. `icon` is decorative; `action` is usually one Button.
 */
export function EmptyState({
  title,
  icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-[color:var(--rule-strong)] px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-[color:var(--bg-sunken)] text-[color:var(--fg-muted)] [&_svg]:size-6"
        >
          {icon}
        </div>
      ) : null}
      {title ? <p className="text-base font-semibold text-[color:var(--fg)]">{title}</p> : null}
      <div className="mt-1.5 max-w-sm text-sm leading-relaxed text-[color:var(--fg-muted)]">
        {children}
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
