"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { logWearAction, type FormState } from "@/modules/wear-logs";
import { WearFields, type WearFieldDefaults } from "@/components/wear/wear-fields";
import { WeatherCapture } from "@/components/wear/weather-capture";
import { Button } from "@/components/ui/button";
import type { UnitSystem } from "@/lib/units";

const INITIAL: FormState = { ok: false };

export function LogWearForm({
  itemId,
  defaults,
  units,
}: {
  itemId: string;
  defaults: WearFieldDefaults;
  units: UnitSystem;
}) {
  const { state, pending, formProps } = useFormAction(logWearAction, INITIAL);
  return (
    <form {...formProps} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="itemId" value={itemId} />
      <WearFields defaults={defaults} errors={state.fieldErrors ?? {}} />
      <WeatherCapture units={units} />
      {state.message ? (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Logging…" : "Log wear"}
      </Button>
    </form>
  );
}
