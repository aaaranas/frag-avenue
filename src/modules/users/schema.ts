import { z } from "zod";
import { isValidTimeZone } from "@/lib/time-zone";

/** An IANA time zone the runtime recognises. */
export const TimeZone = z
  .string()
  .trim()
  .min(1, "Choose a time zone.")
  .max(64)
  .refine(isValidTimeZone, "Unknown time zone.");

/**
 * A device-reported zone where one is optional (sign-up). Anything missing or
 * unrecognised falls back to UTC rather than failing the form — the user can
 * fix it in their profile.
 */
export const OptionalTimeZone = z
  .unknown()
  .transform((v) => (typeof v === "string" && isValidTimeZone(v.trim()) ? v.trim() : "UTC"));

export const UpdateTimeZoneInput = z.object({ timezone: TimeZone });
export type UpdateTimeZoneInput = z.infer<typeof UpdateTimeZoneInput>;
