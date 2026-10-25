"use client";

import { useEffect, useState } from "react";

/** The browser's IANA time zone, or null where `Intl` cannot report one. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Hidden form field carrying the device's time zone. Filled after mount so the
 * server-rendered HTML (which cannot know the zone) hydrates without a
 * mismatch; a submit before hydration sends "" and the server falls back.
 */
export function DeviceTimeZoneInput({ name = "timezone" }: { name?: string }) {
  const [zone, setZone] = useState("");
  useEffect(() => setZone(deviceTimeZone() ?? ""), []);
  return <input type="hidden" name={name} value={zone} />;
}
