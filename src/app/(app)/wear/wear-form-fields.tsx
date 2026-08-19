"use client";

import type { FormState } from "@/modules/wear-logs";
import { OCCASIONS, ENVIRONMENTS, type WEATHER_CONDITIONS } from "@/modules/wear-logs";
import { Field } from "@/components/ui/field";
import { WeatherFieldset } from "./weather-fieldset";

const selectClass = "field-input";
const labelClass = "field-label";
const legendClass = "field-label";

export type WearFieldDefaults = {
  wornAt: string; // "YYYY-MM-DDTHH:mm"
  sprays: string;
  occasion: (typeof OCCASIONS)[number];
  environment: (typeof ENVIRONMENTS)[number];
  temperatureC: string;
  humidityPct: string;
  weatherCondition: (typeof WEATHER_CONDITIONS)[number] | "";
  longevityHours: string;
  projection: string;
  enjoyment: string;
  notes: string;
};

function label(v: string) {
  return v.charAt(0) + v.slice(1).toLowerCase();
}

export function WearFormFields({
  defaults,
  state,
}: {
  defaults: WearFieldDefaults;
  state: FormState;
}) {
  const err = state.fieldErrors ?? {};
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Field
          name="wornAt"
          type="datetime-local"
          defaultValue={defaults.wornAt}
          label="When"
          required
          error={err.wornAt}
        />
        <Field
          name="sprays"
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          defaultValue={defaults.sprays}
          label="Sprays"
          required
          error={err.sprays}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="w-occasion" className={labelClass}>
            Occasion
          </label>
          <select
            id="w-occasion"
            name="occasion"
            defaultValue={defaults.occasion}
            className={selectClass}
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {label(o)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="w-env" className={labelClass}>
            Environment
          </label>
          <select
            id="w-env"
            name="environment"
            defaultValue={defaults.environment}
            className={selectClass}
          >
            {ENVIRONMENTS.map((e) => (
              <option key={e} value={e}>
                {label(e)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <WeatherFieldset
        defaults={{
          temperatureC: defaults.temperatureC,
          humidityPct: defaults.humidityPct,
          weatherCondition: defaults.weatherCondition,
        }}
        fieldErrors={err}
      />

      <fieldset className="border-t border-[color:var(--rule)] pt-5">
        <legend className={legendClass}>Performance</legend>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <Field
            name="longevityHours"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            defaultValue={defaults.longevityHours}
            label="Longevity (h)"
            error={err.longevityHours}
          />
          <Field
            name="projection"
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            defaultValue={defaults.projection}
            label="Projection · 1–5"
            error={err.projection}
          />
          <Field
            name="enjoyment"
            type="number"
            inputMode="numeric"
            min={1}
            max={5}
            defaultValue={defaults.enjoyment}
            label="Enjoyment · 1–5"
            error={err.enjoyment}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="w-notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="w-notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.notes}
          className="rounded-sm border border-[color:var(--rule-strong)] bg-[color:var(--bg)] px-3 py-2 text-sm text-[color:var(--fg)] transition-colors hover:border-[color:var(--fg-muted)] focus:border-[color:var(--accent-amber)] focus:outline-none"
          placeholder="Anything worth remembering about this wear…"
        />
      </div>

      {state.message ? (
        <p role="alert" className="text-xs text-red-700 dark:text-red-400">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
