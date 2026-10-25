import { z } from "zod";
import { isWallTime, zonedWallTimeToUtc } from "@/lib/time-zone";
import { CHECK_IN_OFFSETS } from "./check-ins";

export const OCCASIONS = ["CASUAL", "WORK", "EVENING", "DATE", "FORMAL", "SPORT", "OTHER"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const OCCASION_LABEL: Record<Occasion, string> = {
  CASUAL: "Casual",
  WORK: "Work",
  EVENING: "Evening",
  DATE: "Date",
  FORMAL: "Formal",
  SPORT: "Sport",
  OTHER: "Other",
};

export const MOODS = [
  "CONFIDENT",
  "RELAXED",
  "HAPPY",
  "COZY",
  "FOCUSED",
  "ROMANTIC",
  "ENERGETIC",
  "OTHER",
] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABEL: Record<Mood, string> = {
  CONFIDENT: "Confident",
  RELAXED: "Relaxed",
  HAPPY: "Happy",
  COZY: "Cozy",
  FOCUSED: "Focused",
  ROMANTIC: "Romantic",
  ENERGETIC: "Energetic",
  OTHER: "Other",
};

export const VISIBILITIES = ["FOLLOWERS", "PUBLIC", "PRIVATE"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  FOLLOWERS: "Followers",
  PUBLIC: "Everyone",
  PRIVATE: "Only me",
};

export const CHECK_IN_RESULTS = ["STRONG", "FAINT", "GONE"] as const;
export const CHECK_IN_LABEL: Record<(typeof CHECK_IN_RESULTS)[number], string> = {
  STRONG: "Strong",
  FAINT: "Faint",
  GONE: "Gone",
};

export const MIN_SPRAYS = 1;
export const MAX_SPRAYS = 10;

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

/** Fields shared by logging and editing a wear. */
const wearFields = {
  /**
   * Wall-clock time from `<input type="datetime-local">` ("YYYY-MM-DDTHH:mm"),
   * read in the wear's zone by `toWearFields`. Never parsed with `new Date()`:
   * that would use the server's zone (UTC in production).
   */
  wornAt: z
    .string({ invalid_type_error: "Enter a valid date and time." })
    .trim()
    .refine(isWallTime, "Enter a valid date and time."),
  sprays: z.coerce
    .number({ invalid_type_error: "Sprays must be a number." })
    .int("Whole sprays only.")
    .min(MIN_SPRAYS, `At least ${MIN_SPRAYS} spray.`)
    .max(MAX_SPRAYS, `${MAX_SPRAYS} sprays at most.`),
  occasion: z.enum(OCCASIONS, { errorMap: () => ({ message: "Choose an occasion." }) }),
  mood: emptyToUndef(z.enum(MOODS, { errorMap: () => ({ message: "Choose a mood." }) }).optional()),
  notes: emptyToUndef(z.string().trim().max(1000, "Keep notes under 1,000 characters.").optional()),
  visibility: z.enum(VISIBILITIES, { errorMap: () => ({ message: "Choose who can see it." }) }),
};

/**
 * Log a wear of an owned wardrobe item. `lat`/`lon` (both or neither) are the
 * browser's location, used only to fetch the weather snapshot and never stored.
 */
export const LogWearInput = z
  .object({
    itemId: z.string().trim().min(1, "Pick what you're wearing.").max(64),
    ...wearFields,
    lat: emptyToUndef(z.coerce.number().min(-90).max(90).optional()),
    lon: emptyToUndef(z.coerce.number().min(-180).max(180).optional()),
  })
  .superRefine((v, ctx) => {
    if ((v.lat === undefined) !== (v.lon === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Incomplete location.", path: ["lat"] });
    }
  });
export type LogWearInput = z.infer<typeof LogWearInput>;

/** Edit an existing wear. The item, zone, and weather snapshot are fixed. */
export const EditWearInput = z.object(wearFields);
export type EditWearInput = z.infer<typeof EditWearInput>;

/** A check-in answer, as submitted from a prompt. */
export const CheckInInput = z.object({
  wearId: z.string().trim().min(1).max(64),
  offsetHours: z.coerce
    .number()
    .refine((n) => (CHECK_IN_OFFSETS as readonly number[]).includes(n), "Unknown check-in."),
  result: z.enum(CHECK_IN_RESULTS),
});

/** Converts validated fields to columns, reading `wornAt` in `timeZone`. */
export function toWearFields(input: EditWearInput, timeZone: string) {
  return {
    wornAt: zonedWallTimeToUtc(input.wornAt, timeZone),
    sprays: input.sprays,
    occasion: input.occasion,
    mood: input.mood ?? null,
    notes: input.notes ?? null,
    visibility: input.visibility,
  };
}
export type WearFields = ReturnType<typeof toWearFields>;

/** Clock-skew allowance for "now"; anything later is a typo, not a wear. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

export function isInFuture(wornAt: Date, now: Date): boolean {
  return wornAt.getTime() - now.getTime() > FUTURE_SLACK_MS;
}
