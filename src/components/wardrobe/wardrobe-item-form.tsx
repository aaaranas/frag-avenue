"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { useState } from "react";
import { ITEM_KINDS, KIND_LABEL, type FormState, type ItemKind } from "@/modules/wardrobe";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WardrobeFormDefaults = {
  kind: ItemKind;
  bottleSizeMl: string;
  remainingMl: string;
  priceDecimal: string;
  currency: string;
  purchaseDate: string; // YYYY-MM-DD or ""
  personalNotes: string;
};

const INITIAL: FormState = { ok: false };

const KIND_HINT: Record<ItemKind, string> = {
  BOTTLE: "A full retail bottle",
  DECANT: "Liquid moved to a smaller atomiser",
  SAMPLE: "A small vial, often 1–2 ml",
  WISHLIST: "Something you want, not yet owned",
};

/**
 * Add / edit form for a wardrobe item. `action` is a server action already
 * bound to whatever it needs (the item id for edits).
 */
export function WardrobeItemForm({
  action,
  fragranceId,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fragranceId: string;
  defaults: WardrobeFormDefaults;
  submitLabel: string;
}) {
  const { state, pending, formProps } = useFormAction(action, INITIAL);
  const [kind, setKind] = useState<ItemKind>(defaults.kind);
  const wishlist = kind === "WISHLIST";
  const err = state.fieldErrors ?? {};

  return (
    <form {...formProps} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="fragranceId" value={fragranceId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="field-label mb-1">Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {ITEM_KINDS.map((k) => (
            <label
              key={k}
              className={cn(
                "relative flex min-h-11 cursor-pointer flex-col justify-center rounded-md border px-3 py-2 text-sm transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus)]",
                kind === k
                  ? "border-[color:var(--accent-color)] bg-[color:var(--accent-wash)]"
                  : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
              )}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                // Invisible but covering the whole card: the full card is the
                // hit area and keyboard focus lands on a real radio.
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              <span className="font-medium">{KIND_LABEL[k]}</span>
              <span className="text-xs text-[color:var(--fg-muted)]">{KIND_HINT[k]}</span>
            </label>
          ))}
        </div>
        {err.kind ? (
          <p role="alert" className="form-error">
            {err.kind}
          </p>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <Field
          name="bottleSizeMl"
          label={wishlist ? "Size, ml (optional)" : "Size, ml"}
          type="number"
          inputMode="numeric"
          min={1}
          max={2000}
          defaultValue={defaults.bottleSizeMl}
          error={err.bottleSizeMl}
        />
        {wishlist ? null : (
          <Field
            name="remainingMl"
            label="Left, ml"
            type="number"
            inputMode="numeric"
            min={0}
            max={2000}
            defaultValue={defaults.remainingMl}
            hint="Sets the fill level"
            error={err.remainingMl}
          />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-4">
        <Field
          name="priceDecimal"
          label={wishlist ? "Expected price" : "Price paid"}
          inputMode="decimal"
          placeholder="3500.00"
          defaultValue={defaults.priceDecimal}
          hint={wishlist ? undefined : "Used for cost per wear"}
          error={err.priceDecimal}
        />
        <Field
          name="currency"
          label="Currency"
          maxLength={3}
          autoCapitalize="characters"
          defaultValue={defaults.currency}
          error={err.currency}
        />
      </div>

      {wishlist ? null : (
        <Field
          name="purchaseDate"
          label="Bought on (optional)"
          type="date"
          defaultValue={defaults.purchaseDate}
          error={err.purchaseDate}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="personalNotes" className="field-label">
          Notes (optional)
        </label>
        <textarea
          id="personalNotes"
          name="personalNotes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.personalNotes}
          className="field-input"
        />
      </div>

      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
