import { Input } from "./input";
import { Label } from "./label";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * A labelled shadcn Input with its hint or error below. The invalid state is
 * driven off `aria-invalid`, so there is one source of truth for "this field
 * is wrong", and the error is tied to the input with aria-describedby.
 */
export function Field({ id, label, error, hint, className, ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={className}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-[color:var(--fg-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
