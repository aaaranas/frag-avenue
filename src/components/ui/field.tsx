import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Accessible text input. Label above, error in its own slot below.
 *
 * Appearance comes from the shared `.field-input` / `.field-label` utilities so
 * this control and the hand-built selects on the wear and collection forms
 * cannot drift apart. The invalid state is driven off `aria-invalid`, which the
 * input already sets — no second source of truth for "this field is wrong".
 */
export function Field({ id, label, error, hint, className, ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn("field-input", className)}
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
