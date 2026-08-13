import "server-only";
import { OpenMeteoResponse, type CurrentWeather } from "./schema";
import { wmoCodeToCondition } from "./codes";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 5_000;

/**
 * Fetch the current weather at (lat, lon) from Open-Meteo.
 * Returns null on any failure (network, timeout, non-2xx, schema mismatch).
 * Callers should treat null as "auto-fill unavailable — user can type manually".
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number,
): Promise<CurrentWeather | null> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,relative_humidity_2m,weather_code",
    timezone: "auto",
  });

  let res: Response;
  try {
    res = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return null;
  }

  const parsed = OpenMeteoResponse.safeParse(raw);
  if (!parsed.success) return null;

  const c = parsed.data.current;
  return {
    temperatureC: Math.round(c.temperature_2m * 10) / 10,
    humidityPct: Math.round(c.relative_humidity_2m),
    condition: wmoCodeToCondition(c.weather_code),
  };
}
