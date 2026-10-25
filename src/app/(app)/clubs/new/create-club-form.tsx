"use client";

import { createClubAction, type FormState } from "@/modules/clubs";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

export function CreateClubForm() {
  const { state, pending, formProps } = useFormAction(createClubAction, INITIAL);
  const err = state.fieldErrors ?? {};
  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
      <Field name="name" label="Club name" required maxLength={60} error={err.name} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="field-label">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={280}
          className="field-input"
          aria-invalid={err.description ? true : undefined}
          aria-describedby={err.description ? "description-error" : undefined}
        />
        {err.description ? (
          <p id="description-error" role="alert" className="form-error">
            {err.description}
          </p>
        ) : null}
      </div>
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create club"}
        </Button>
      </div>
    </form>
  );
}
