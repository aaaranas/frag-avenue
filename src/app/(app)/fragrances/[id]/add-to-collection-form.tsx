"use client";

import { useActionState } from "react";
import { addToCollectionAction, type FormState } from "@/modules/collection";
import { Field } from "@/components/ui/field";

const INITIAL: FormState = { ok: false };

const selectClass =
  "rounded-sm border border-[color:var(--rule-strong)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] hover:border-[color:var(--fg-muted)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors";
const labelClass =
  "text-[11px] font-medium tracking-[0.14em] uppercase text-[color:var(--fg-muted)]";

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
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-[color:var(--fg)] px-5 py-2.5 text-sm font-medium tracking-wide text-[color:var(--bg)] transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save to my collection"}
      </button>
    </form>
  );
}
