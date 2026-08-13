"use client";

import { useActionState } from "react";
import { signInAction, type FormState } from "@/modules/auth";
import { Field } from "@/components/ui/field";

const INITIAL: FormState = { ok: false };

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      {state.message ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-[color:var(--fg)] px-5 py-3 text-sm font-medium tracking-wide text-[color:var(--bg)] transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
