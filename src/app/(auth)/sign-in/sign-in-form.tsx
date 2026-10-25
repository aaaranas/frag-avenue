"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { signInAction, type FormState } from "@/modules/auth";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

export function SignInForm({ next }: { next?: string }) {
  const { state, pending, formProps } = useFormAction(signInAction, INITIAL);

  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
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
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
