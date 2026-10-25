"use client";

import { useActionState, useEffect, useState } from "react";
import { updateTimeZoneAction, type FormState } from "@/modules/users";
import { deviceTimeZone } from "@/components/forms/device-time-zone-input";

const INITIAL: FormState = { ok: false };
const DISMISS_KEY = "frag:tz-nudge-dismissed";

/**
 * Offers to switch the profile time zone when this device reports a different
 * one. Existing accounts were created as UTC, so this is how they get a real
 * zone. Dismissal is remembered per device zone: dismiss "Europe/Paris" while
 * travelling and you are not asked again there, but are asked in a new zone.
 */
export function TimeZoneNudge({ profileTimeZone }: { profileTimeZone: string }) {
  const [device, setDevice] = useState<string | null>(null);
  const [state, action, pending] = useActionState(updateTimeZoneAction, INITIAL);

  useEffect(() => {
    const zone = deviceTimeZone();
    if (!zone || zone === profileTimeZone) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === zone) return;
    } catch {
      /* storage unavailable: show the nudge */
    }
    setDevice(zone);
  }, [profileTimeZone]);

  if (!device || state.ok) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, device);
    } catch {
      /* storage unavailable: hide for this render only */
    }
    setDevice(null);
  };

  const pretty = (z: string) => z.replaceAll("_", " ");

  return (
    <div
      role="region"
      aria-label="Time zone"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[color:var(--rule)] px-5 py-1 text-xs md:px-12"
    >
      <p className="flex-1 text-[color:var(--fg-muted)]">
        Your profile uses{" "}
        <strong className="text-[color:var(--fg)]">{pretty(profileTimeZone)}</strong>, but this
        device is in <strong className="text-[color:var(--fg)]">{pretty(device)}</strong>. Streaks
        count days in your profile&rsquo;s zone.
      </p>
      <form action={action}>
        <input type="hidden" name="timezone" value={device} />
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-sm px-3 font-medium text-[color:var(--fg)] underline underline-offset-4"
        >
          {pending ? "Switching…" : `Use ${pretty(device)}`}
        </button>
      </form>
      <button
        type="button"
        onClick={dismiss}
        className="min-h-11 px-2 text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        Keep {pretty(profileTimeZone)}
      </button>
      {state.fieldErrors?.timezone ? (
        <p role="alert" className="w-full text-[color:var(--destructive)]">
          {state.fieldErrors.timezone}
        </p>
      ) : null}
    </div>
  );
}
