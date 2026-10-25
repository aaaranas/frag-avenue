import { z } from "zod";
import { isValidTimeZone } from "@/lib/time-zone";
import { Username } from "@/lib/username";

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

export const VISIBILITY_OPTIONS = ["FOLLOWERS", "PUBLIC", "PRIVATE"] as const;
export const UNIT_OPTIONS = ["METRIC", "IMPERIAL"] as const;

/** Profile settings form. */
export const ProfileInput = z.object({
  username: Username,
  name: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().trim().max(80, "80 characters at most.").optional(),
  ),
  bio: z.preprocess(
    (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
    z.string().trim().max(200, "200 characters at most.").optional(),
  ),
  defaultVisibility: z.enum(VISIBILITY_OPTIONS, {
    errorMap: () => ({ message: "Choose who sees new wears." }),
  }),
  units: z.enum(UNIT_OPTIONS, { errorMap: () => ({ message: "Choose units." }) }),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

/** Just the username, for the "choose a username" prompt. */
export const UsernameInput = z.object({ username: Username });
