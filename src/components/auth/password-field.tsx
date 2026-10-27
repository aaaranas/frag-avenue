"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * `Field` with a show/hide toggle inside the input. The toggle's name says
 * what it will do ("Show"/"Hide"), not "Show password", so the input stays
 * the only control labelled "Password".
 */
export function PasswordField({ id, label, error, hint, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? rest.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("pr-12", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={inputId}
          aria-label={visible ? "Hide" : "Show"}
          className="absolute inset-y-0 right-0 flex size-11 items-center justify-center rounded-r-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
        >
          <Icon className="size-[18px]" aria-hidden />
        </button>
      </div>
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
