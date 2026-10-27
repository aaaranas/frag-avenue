"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { signUpAction, type FormState } from "@/modules/auth";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { DeviceTimeZoneInput } from "@/components/forms/device-time-zone-input";

const INITIAL: FormState = { ok: false };

export function SignUpForm() {
  const { state, pending, formProps } = useFormAction(signUpAction, INITIAL);

  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
      <DeviceTimeZoneInput />
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      />
      <Field
        name="username"
        type="text"
        label="Username"
        // Not "username": you sign in with your email, and password managers
        // would save this handle as the login instead.
        autoComplete="nickname"
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={3}
        maxLength={20}
        hint="3–20 letters, numbers, or _. People find you by it."
        error={state.fieldErrors?.username}
      />
      <Field
        name="name"
        type="text"
        label="Display name (optional)"
        autoComplete="name"
        error={state.fieldErrors?.name}
      />
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
