import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Minimal accessible input. Label sits above; error takes its slot below.
 * No decorative frames — the input is a subtle bordered rectangle.
 */
export function Field({ id, label, error, hint, className, ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-[11px] font-medium tracking-[0.14em] text-[color:var(--fg-muted)] uppercase"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-sm border bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] transition-colors placeholder:text-[color:var(--fg-faint)]",
          "border-[color:var(--rule-strong)] hover:border-[color:var(--fg-muted)]",
          "focus:border-[color:var(--color-accent)] focus:outline-none",
          error && "border-red-700/60 focus:border-red-700 dark:border-red-500/60",
          className,
        )}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-[color:var(--fg-faint)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
