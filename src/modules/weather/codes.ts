/**
 * WMO Weather interpretation codes (WW), per Open-Meteo docs.
 * Bucketed to Frag Avenue's short condition vocabulary — see
 * `WEATHER_CONDITIONS` in `src/modules/wear-logs/schema.ts`.
 *
 * Reference: https://open-meteo.com/en/docs (Weather variable documentation).
 */

export type WeatherBucket = "clear" | "clouds" | "rain" | "snow" | "storm" | "fog";

export function wmoCodeToCondition(code: number): WeatherBucket | null {
  if (!Number.isFinite(code)) return null;
  if (code === 0) return "clear";
  if (code >= 1 && code <= 3) return "clouds";
  if (code === 45 || code === 48) return "fog";
  // Drizzle 51..57, Rain 61..67, Rain showers 80..82, Freezing rain 66..67
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return "rain";
  }
  // Snowfall 71..77, Snow showers 85..86
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  // Thunderstorm 95..99
  if (code >= 95 && code <= 99) return "storm";
  return null;
}

export const CONDITION_LABEL: Record<WeatherBucket, string> = {
  clear: "Clear",
  clouds: "Cloudy",
  rain: "Rain",
  snow: "Snow",
  storm: "Storm",
  fog: "Fog",
};

/** Label for a stored condition string; null for anything unrecognised. */
export function conditionLabel(value: string | null): string | null {
  return value && value in CONDITION_LABEL ? CONDITION_LABEL[value as WeatherBucket] : null;
}
