"use client";

import { useState } from "react";
import {
  MAX_SPRAYS,
  MIN_SPRAYS,
  MOODS,
  MOOD_LABEL,
  OCCASIONS,
  OCCASION_LABEL,
  VISIBILITIES,
  VISIBILITY_LABEL,
  type Mood,
  type Occasion,
  type Visibility,
} from "@/modules/wear-logs";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export type WearFieldDefaults = {
  wornAt: string; // YYYY-MM-DDTHH:mm, in the wear's zone
  sprays: number;
  occasion: Occasion;
  mood: Mood | "";
  notes: string;
  visibility: Visibility;
};

const VISIBILITY_HINT: Record<Visibility, string> = {
  FOLLOWERS: "People who follow you",
  PUBLIC: "Anyone on Frag Avenue",
  PRIVATE: "Just you",
};

/** The fields shared by logging and editing a wear. */
export function WearFields({
  defaults,
  errors,
}: {
  defaults: WearFieldDefaults;
  errors: Record<string, string>;
}) {
  return (
    <>
      <Field
        name="wornAt"
        label="When"
        type="datetime-local"
        required
        defaultValue={defaults.wornAt}
        error={errors.wornAt}
      />
      <SpraysStepper initial={defaults.sprays} error={errors.sprays} />
      <ChoiceGroup
        name="occasion"
        legend="Occasion"
        options={OCCASIONS.map((o) => ({ value: o, label: OCCASION_LABEL[o] }))}
        initial={defaults.occasion}
        error={errors.occasion}
      />
      <ChoiceGroup
        name="mood"
        legend="Mood (optional)"
        options={[
          { value: "", label: "None" },
          ...MOODS.map((m) => ({ value: m, label: MOOD_LABEL[m] })),
        ]}
        initial={defaults.mood}
        error={errors.mood}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="field-label">
          Note (optional)
        </label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={defaults.notes}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? "notes-error" : undefined}
        />
        {errors.notes ? (
          <p id="notes-error" role="alert" className="form-error">
            {errors.notes}
          </p>
        ) : null}
      </div>
      <ChoiceGroup
        name="visibility"
        legend="Who can see this"
        options={VISIBILITIES.map((v) => ({
          value: v,
          label: VISIBILITY_LABEL[v],
          hint: VISIBILITY_HINT[v],
        }))}
        initial={defaults.visibility}
        error={errors.visibility}
        columns={3}
      />
    </>
  );
}

function SpraysStepper({ initial, error }: { initial: number; error?: string }) {
  const [value, setValue] = useState(String(initial));
  const n = Number(value);
  const set = (next: number) => setValue(String(Math.min(MAX_SPRAYS, Math.max(MIN_SPRAYS, next))));
  const step =
    "flex size-11 items-center justify-center rounded-md border border-[color:var(--rule-strong)] text-lg disabled:opacity-40";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="sprays" className="field-label">
        Sprays
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={step}
          aria-label="One fewer spray"
          aria-controls="sprays"
          disabled={!(n > MIN_SPRAYS)}
          onClick={() => set((Number.isFinite(n) ? n : MIN_SPRAYS) - 1)}
        >
          −
        </button>
        <input
          id="sprays"
          name="sprays"
          type="number"
          inputMode="numeric"
          min={MIN_SPRAYS}
          max={MAX_SPRAYS}
          step={1}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="field-input w-20 text-center tabular-nums"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "sprays-error" : "sprays-hint"}
        />
        <button
          type="button"
          className={step}
          aria-label="One more spray"
          aria-controls="sprays"
          disabled={!(n < MAX_SPRAYS)}
          onClick={() => set((Number.isFinite(n) ? n : 0) + 1)}
        >
          +
        </button>
        <span id="sprays-hint" className="text-xs text-[color:var(--fg-muted)]">
          {MIN_SPRAYS}–{MAX_SPRAYS}
        </span>
      </div>
      {error ? (
        <p id="sprays-error" role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceGroup({
  name,
  legend,
  options,
  initial,
  error,
  columns,
}: {
  name: string;
  legend: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  initial: string;
  error?: string;
  columns?: 3;
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="field-label mb-1">{legend}</legend>
      <div className={columns === 3 ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}>
        {options.map((o) => (
          <label
            key={o.value || "none"}
            className={cn(
              "relative flex min-h-11 cursor-pointer flex-col justify-center rounded-md border px-3 py-1.5 text-sm transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus)]",
              selected === o.value
                ? "border-[color:var(--accent-color)] bg-[color:var(--accent-wash)] font-medium"
                : "border-[color:var(--rule-strong)] hover:bg-[color:var(--bg-sunken)]",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={selected === o.value}
              onChange={() => setSelected(o.value)}
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            />
            <span>{o.label}</span>
            {o.hint ? (
              <span className="text-xs font-normal text-[color:var(--fg-muted)]">{o.hint}</span>
            ) : null}
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="form-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
