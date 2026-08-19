"use client";

import { useActionState } from "react";
import { updateCollectionItemAction, type FormState } from "@/modules/collection";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const INITIAL: FormState = { ok: false };

const selectClass = "field-input";
const labelClass = "field-label";

type Defaults = {
  bottleSizeMl: number;
  remainingMl: string;
  priceDecimal: string;
  currency: string;
  purchaseDate: string;
  purchaseSource: string;
  batchCode: string;
  condition: "NEW" | "USED" | "DECANT";
  personalRating: string;
  personalNotes: string;
};

export function EditCollectionForm({ itemId, defaults }: { itemId: string; defaults: Defaults }) {
  const bound = updateCollectionItemAction.bind(null, itemId);
  const [state, action, pending] = useActionState(bound, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <Field
          name="bottleSizeMl"
          type="number"
          inputMode="numeric"
          min={1}
          max={2000}
          defaultValue={defaults.bottleSizeMl}
          label="Size (ml)"
          required
          error={state.fieldErrors?.bottleSizeMl}
        />
        <Field
          name="remainingMl"
          type="number"
          inputMode="numeric"
          min={0}
          max={2000}
          defaultValue={defaults.remainingMl}
          label="Remaining (ml)"
          error={state.fieldErrors?.remainingMl}
        />
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-4">
        <Field
          name="priceDecimal"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaults.priceDecimal}
          label="Purchase price"
          error={state.fieldErrors?.priceDecimal}
        />
        <Field
          name="currency"
          type="text"
          maxLength={3}
          placeholder="PHP"
          defaultValue={defaults.currency}
          label="Ccy"
          error={state.fieldErrors?.currency}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          name="purchaseDate"
          type="date"
          defaultValue={defaults.purchaseDate}
          label="Purchase date"
          error={state.fieldErrors?.purchaseDate}
        />
        <Field
          name="purchaseSource"
          type="text"
          maxLength={200}
          defaultValue={defaults.purchaseSource}
          label="Source"
          error={state.fieldErrors?.purchaseSource}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          name="batchCode"
          type="text"
          maxLength={50}
          defaultValue={defaults.batchCode}
          label="Batch code"
          error={state.fieldErrors?.batchCode}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-condition" className={labelClass}>
            Condition
          </label>
          <select
            id="edit-condition"
            name="condition"
            defaultValue={defaults.condition}
            className={selectClass}
          >
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="DECANT">Decant</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          name="personalRating"
          type="number"
          inputMode="numeric"
          min={1}
          max={5}
          defaultValue={defaults.personalRating}
          label="Personal rating · 1–5"
          error={state.fieldErrors?.personalRating}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="edit-notes"
          name="personalNotes"
          rows={4}
          maxLength={2000}
          defaultValue={defaults.personalNotes}
          className="rounded-sm border border-[color:var(--rule-strong)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] transition-colors hover:border-[color:var(--fg-muted)] focus:border-[color:var(--accent-amber)] focus:outline-none"
        />
      </div>

      {state.message ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
