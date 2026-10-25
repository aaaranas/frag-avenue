import { z } from "zod";
import type { WeatherBucket } from "./codes";

/** Trimmed Open-Meteo /v1/forecast shapes. Only the fields we read are validated. */
export const OpenMeteoCurrentResponse = z.object({
  current: z.object({
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number(),
  }),
});

export const OpenMeteoHourlyResponse = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number().nullable()),
    relative_humidity_2m: z.array(z.number().nullable()),
    weather_code: z.array(z.number().nullable()),
  }),
});

/** Coordinates from the browser. Validated, then rounded before any use. */
export const CoordsInput = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});
export type Coords = z.infer<typeof CoordsInput>;

/** A weather reading attached to a wear. Metric, always. */
export type WeatherSnapshot = {
  temperatureC: number;
  humidityPct: number;
  condition: WeatherBucket | null;
  /** When the reading applies (the hour for historic lookups). */
  observedAt: Date;
  /** Provider id, stored on the wear; drives the attribution line. */
  provider: string;
};

/**
 * Anything that can produce a weather snapshot for a place and time. Isolated
 * so the provider can change (or a native client can share it) without
 * touching callers.
 */
export interface WeatherService {
  readonly provider: string;
  /** The weather at `coords` around `at`, or null if unavailable. Never throws. */
  snapshot(coords: Coords, at: Date): Promise<WeatherSnapshot | null>;
}
