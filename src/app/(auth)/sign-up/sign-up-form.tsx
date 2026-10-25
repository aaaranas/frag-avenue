"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { signUpAction, type FormState } from "@/modules/auth";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { DeviceTimeZoneInput } from "@/components/forms/device-time-zone-input";

const INITIAL: FormState = { ok: false };

export function SignUpForm() {
  const { state, pending, formProps } = useFormAction(signUpAction, INITIAL);

  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
      <DeviceTimeZoneInput />
      <Field
        name="name"
        type="text"
        label="Name (optional)"
        autoComplete="name"
        error={state.fieldErrors?.name}
      />
      <Field
        name="username"
        type="text"
        label="Username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={3}
        maxLength={20}
        hint="3–20 letters, numbers, or _. People find you by it."
        error={state.fieldErrors?.username}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
