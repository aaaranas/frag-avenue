"use client";

import { setUsernameAction, type FormState } from "@/modules/users";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

/** Shown to accounts created before usernames existed. */
export function UsernamePrompt() {
  const { state, pending, formProps } = useFormAction(setUsernameAction, INITIAL);
  if (state.ok) return null;
  return (
    <section
      aria-labelledby="username-heading"
      className="mb-6 rounded-lg border border-[color:var(--rule-strong)] bg-[color:var(--bg-elev)] p-4"
    >
      <h2 id="username-heading" className="font-semibold">
        Choose a username
      </h2>
      <p className="mt-1 mb-3 text-sm text-[color:var(--fg-muted)]">
        People find and follow you by it. Your existing wears stay private until you share new ones.
      </p>
      <form {...formProps} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <div className="flex-1">
          <Field
            name="username"
            label="Username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            error={state.fieldErrors?.username}
          />
        </div>
        <Button type="submit" disabled={pending} className="sm:mt-7">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </section>
  );
}
