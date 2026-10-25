"use client";

import { useActionState } from "react";
import { addToCollectionAction, type FormState } from "@/modules/collection";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

const selectClass = "field-input";
const labelClass = "field-label";

export function AddToCollectionForm({
  fragranceId,
  defaultCurrency = "PHP",
}: {
  fragranceId: string;
  defaultCurrency?: string;
}) {
  const [state, action, pending] = useActionState(addToCollectionAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="fragranceId" value={fragranceId} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          name="bottleSizeMl"
          type="number"
          inputMode="numeric"
          min={1}
          max={2000}
          defaultValue={100}
          label="Size (ml)"
          required
          error={state.fieldErrors?.bottleSizeMl}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-condition" className={labelClass}>
            Condition
          </label>
          <select id="add-condition" name="condition" defaultValue="NEW" className={selectClass}>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="DECANT">Decant</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-4">
        <Field
          name="priceDecimal"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          label="Price (optional)"
          error={state.fieldErrors?.priceDecimal}
        />
        <Field
          name="currency"
          type="text"
          maxLength={3}
          defaultValue={defaultCurrency}
          label="Ccy"
          error={state.fieldErrors?.currency}
        />
      </div>

      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save to my collection"}
      </Button>
    </form>
  );
}
