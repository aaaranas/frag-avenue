"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import {
  CONCENTRATIONS,
  CONCENTRATION_LABEL,
  submitFragranceAction,
  type FormState,
} from "@/modules/fragrances";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INITIAL: FormState = { ok: false };

export function SubmitFragranceForm({ defaultName }: { defaultName: string }) {
  const { state, pending, formProps } = useFormAction(submitFragranceAction, INITIAL);
  const err = state.fieldErrors ?? {};

  return (
    <form {...formProps} className="flex flex-col gap-5" noValidate>
      <Field
        name="brand"
        label="House"
        placeholder="e.g. Rasasi"
        required
        maxLength={80}
        error={err.brand}
      />
      <Field
        name="name"
        label="Name"
        placeholder="e.g. Hawas Ice"
        required
        maxLength={120}
        defaultValue={defaultName}
        error={err.name}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="concentration">Concentration</Label>
        <select
          id="concentration"
          name="concentration"
          defaultValue="EDP"
          className="field-input"
          aria-invalid={err.concentration ? true : undefined}
          aria-describedby={err.concentration ? "concentration-error" : undefined}
        >
          {CONCENTRATIONS.map((c) => (
            <option key={c} value={c}>
              {CONCENTRATION_LABEL[c]}
            </option>
          ))}
        </select>
        {err.concentration ? (
          <p id="concentration-error" role="alert" className="form-error">
            {err.concentration}
          </p>
        ) : null}
      </div>
      <Field
        name="releaseYear"
        label="Release year (optional)"
        type="number"
        inputMode="numeric"
        min={1700}
        error={err.releaseYear}
      />
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}
