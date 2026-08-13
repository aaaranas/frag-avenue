import { z } from "zod";
import type { WeatherBucket } from "./codes";

/**
 * Trimmed Zod shape of the Open-Meteo /v1/forecast response.
 * We only validate the fields we consume — extra keys are ignored.
 */
export const OpenMeteoResponse = z.object({
  current: z.object({
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number(),
  }),
});
export type OpenMeteoResponse = z.infer<typeof OpenMeteoResponse>;

/**
 * Client-facing coordinate validation for the /api/weather route.
 */
export const CoordsInput = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});
export type CoordsInput = z.infer<typeof CoordsInput>;

/**
 * Shape returned by the weather service — the shape the form actually consumes.
 */
export type CurrentWeather = {
  temperatureC: number;
  humidityPct: number;
  condition: WeatherBucket | null;
};
