"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTimeZoneAction, type FormState } from "@/modules/users";
import { deviceTimeZone } from "@/components/forms/device-time-zone-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const INITIAL: FormState = { ok: false };

export function TimeZoneForm({ current, zones }: { current: string; zones: readonly string[] }) {
  const [state, action, pending] = useActionState(updateTimeZoneAction, INITIAL);
  const [value, setValue] = useState(current);
  const [device, setDevice] = useState<string | null>(null);
  useEffect(() => setDevice(deviceTimeZone()), []);

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Label htmlFor="tz">Time zone</Label>
      <select
        id="tz"
        name="timezone"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="field-input min-h-11"
        aria-describedby="tz-hint"
        aria-invalid={state.fieldErrors?.timezone ? true : undefined}
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <p id="tz-hint" className="text-xs text-[color:var(--fg-muted)]">
        Decides what &ldquo;today&rdquo; means for your streak. Wears you already logged keep the
        zone they were logged in.
      </p>
      {state.fieldErrors?.timezone ? (
        <p role="alert" className="form-error">
          {state.fieldErrors.timezone}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p role="status" className="text-xs text-[color:var(--fg-muted)]">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending || value === current} className="min-h-11">
          {pending ? "Saving…" : "Save time zone"}
        </Button>
        {device && device !== value && zones.includes(device) ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setValue(device)}
          >
            Use this device&rsquo;s zone ({device.replaceAll("_", " ")})
          </Button>
        ) : null}
      </div>
    </form>
  );
}
