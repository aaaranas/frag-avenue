"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * A password input with a Show/Hide toggle; otherwise the same markup as
 * `Field`. The toggle is named "Show"/"Hide" (not "Show password") so the
 * input stays the only control labelled "Password".
 */
export function PasswordField({ id, label, error, hint, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? rest.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("field-input pr-16", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={inputId}
          className="absolute inset-y-0 right-0 flex min-h-11 min-w-14 items-center justify-center rounded-r-md px-3 text-xs font-medium text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-xs text-[color:var(--fg-faint)]">
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
