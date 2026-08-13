import { z } from "zod";

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema);

export const OCCASIONS = ["WORK", "CASUAL", "EVENING", "FORMAL", "SPORT", "DATE", "OTHER"] as const;
export const ENVIRONMENTS = ["INDOOR", "OUTDOOR", "MIXED"] as const;
export const WEATHER_CONDITIONS = ["clear", "clouds", "rain", "snow", "storm", "fog"] as const;

/**
 * Form-shaped input from an HTML wear form. `fragranceId` is required; the
 * server resolves it from `collectionItemId` when possible (see actions.ts).
 * A client-supplied `fragranceId` is validated against the picked collection
 * item on the server so users cannot attribute a wear to a bottle they don't own.
 */
export const WearFormInput = z.object({
  fragranceId: z.string().trim().min(1, "Fragrance is required."),
  collectionItemId: emptyToUndef(z.string().trim().min(1).optional()),
  wornAt: z.coerce.date({ invalid_type_error: "Enter a valid date/time." }),
  sprays: z.coerce
    .number({ invalid_type_error: "Sprays must be a number." })
    .int("Whole sprays only.")
    .min(1, "At least 1 spray.")
    .max(20, "20 sprays is the maximum."),
  occasion: z.enum(OCCASIONS).default("CASUAL"),
  environment: z.enum(ENVIRONMENTS).default("MIXED"),
  temperatureC: emptyToUndef(
    z.coerce.number().min(-50, "Too cold.").max(60, "Too hot.").optional(),
  ),
  humidityPct: emptyToUndef(z.coerce.number().int().min(0).max(100).optional()),
  weatherCondition: emptyToUndef(z.enum(WEATHER_CONDITIONS).optional()),
  weatherSource: emptyToUndef(z.enum(["AUTO", "MANUAL"]).optional()),
  longevityHours: emptyToUndef(z.coerce.number().min(0).max(24).optional()),
  projection: emptyToUndef(
    z.coerce.number().int().min(1, "1–5 only.").max(5, "1–5 only.").optional(),
  ),
  enjoyment: emptyToUndef(
    z.coerce.number().int().min(1, "1–5 only.").max(5, "1–5 only.").optional(),
  ),
  notes: emptyToUndef(z.string().trim().max(2000).optional()),
});

export type WearFormInput = z.infer<typeof WearFormInput>;

/**
 * Pure. Returns:
 *  - "NONE" when no weather field is set,
 *  - the explicit `sourceHint` (AUTO or MANUAL) when weather is present and a
 *    hint is provided by the form. The auto-fill client sends "AUTO", which
 *    flips to "MANUAL" as soon as the user edits any weather field.
 *  - "MANUAL" as the safe default when weather is present without a hint.
 */
export function deriveWeatherSource(input: {
  temperatureC?: number;
  humidityPct?: number;
  weatherCondition?: string;
  sourceHint?: "AUTO" | "MANUAL";
}): "AUTO" | "MANUAL" | "NONE" {
  const any =
    input.temperatureC !== undefined ||
    input.humidityPct !== undefined ||
    (input.weatherCondition !== undefined && input.weatherCondition !== "");
  if (!any) return "NONE";
  return input.sourceHint ?? "MANUAL";
}

export function toPersistenceInput(input: WearFormInput) {
  const weatherSource = deriveWeatherSource({
    temperatureC: input.temperatureC,
    humidityPct: input.humidityPct,
    weatherCondition: input.weatherCondition,
    sourceHint: input.weatherSource,
  });
  return {
    fragranceId: input.fragranceId,
    collectionItemId: input.collectionItemId ?? null,
    wornAt: input.wornAt,
    sprays: input.sprays,
    occasion: input.occasion,
    environment: input.environment,
    temperatureC: input.temperatureC ?? null,
    humidityPct: input.humidityPct ?? null,
    weatherCondition: input.weatherCondition ?? null,
    weatherSource,
    longevityHours: input.longevityHours ?? null,
    projection: input.projection ?? null,
    enjoyment: input.enjoyment ?? null,
    notes: input.notes ?? null,
  };
}
