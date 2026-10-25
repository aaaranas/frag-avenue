import "server-only";
import { OpenMeteoCurrentResponse, OpenMeteoHourlyResponse } from "./schema";
import type { Coords, WeatherService, WeatherSnapshot } from "./schema";
import { wmoCodeToCondition } from "./codes";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 5_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Within this long of now, the current conditions are the snapshot. */
const CURRENT_WINDOW_MS = HOUR_MS;
/** How far back Open-Meteo's forecast API serves hourly history. */
const MAX_PAST_MS = 92 * DAY_MS;
/** Clock-skew allowance for a wear logged "now". */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

/**
 * ~1 km precision. Applied before every request, so precise locations never
 * leave the server (and are never stored).
 */
export function roundCoords(c: Coords): Coords {
  const r = (n: number) => Math.round(n * 100) / 100;
  return { lat: r(c.lat), lon: r(c.lon) };
}

/** "YYYY-MM-DDTHH:00" in UTC, for the hour nearest `at`. */
export function nearestUtcHour(at: Date): string {
  const d = new Date(Math.round(at.getTime() / HOUR_MS) * HOUR_MS);
  return d.toISOString().slice(0, 13) + ":00";
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

async function getJson(fetchImpl: Fetch, url: string): Promise<unknown | null> {
  try {
    const res = await fetchImpl(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const tenth = (n: number) => Math.round(n * 10) / 10;

/**
 * Open-Meteo (free tier: non-commercial, < 10k calls/day, CC BY 4.0 data).
 * Current conditions for a wear within the last hour, otherwise the hourly
 * reading nearest the wear's time (up to 92 days back).
 */
export function openMeteoWeatherService(
  fetchImpl: Fetch = fetch,
  now: () => Date = () => new Date(),
): WeatherService {
  return {
    provider: "open-meteo",
    async snapshot(coords, at) {
      const nowMs = now().getTime();
      const age = nowMs - at.getTime();
      if (age < -FUTURE_SLACK_MS || age > MAX_PAST_MS) return null;
      const { lat, lon } = roundCoords(coords);
      const base = { latitude: lat.toString(), longitude: lon.toString(), timezone: "GMT" };

      if (age <= CURRENT_WINDOW_MS) {
        const params = new URLSearchParams({
          ...base,
          current: "temperature_2m,relative_humidity_2m,weather_code",
        });
        const parsed = OpenMeteoCurrentResponse.safeParse(
          await getJson(fetchImpl, `${FORECAST_URL}?${params}`),
        );
        if (!parsed.success) return null;
        const c = parsed.data.current;
        return {
          temperatureC: tenth(c.temperature_2m),
          humidityPct: Math.round(c.relative_humidity_2m),
          condition: wmoCodeToCondition(c.weather_code),
          observedAt: new Date(nowMs),
          provider: "open-meteo",
        } satisfies WeatherSnapshot;
      }

      const hour = nearestUtcHour(at);
      const params = new URLSearchParams({
        ...base,
        hourly: "temperature_2m,relative_humidity_2m,weather_code",
        start_hour: hour,
        end_hour: hour,
      });
      const parsed = OpenMeteoHourlyResponse.safeParse(
        await getJson(fetchImpl, `${FORECAST_URL}?${params}`),
      );
      if (!parsed.success) return null;
      const h = parsed.data.hourly;
      const i = h.time.indexOf(hour);
      const t = i >= 0 ? h.temperature_2m[i] : null;
      const rh = i >= 0 ? h.relative_humidity_2m[i] : null;
      if (t == null || rh == null) return null;
      const code = h.weather_code[i];
      return {
        temperatureC: tenth(t),
        humidityPct: Math.round(rh),
        condition: code == null ? null : wmoCodeToCondition(code),
        observedAt: new Date(`${hour}:00Z`),
        provider: "open-meteo",
      };
    },
  };
}

/**
 * Fixed readings, for e2e tests and offline development. Enabled only by
 * WEATHER_PROVIDER=static; never set that in production. Stored with
 * provider "static" so such wears are identifiable.
 */
export function staticWeatherService(): WeatherService {
  return {
    provider: "static",
    async snapshot(_coords, at) {
      return {
        temperatureC: 30,
        humidityPct: 70,
        condition: "clear",
        observedAt: at,
        provider: "static",
      };
    },
  };
}

export function getWeatherService(): WeatherService {
  return process.env.WEATHER_PROVIDER === "static"
    ? staticWeatherService()
    : openMeteoWeatherService();
}
