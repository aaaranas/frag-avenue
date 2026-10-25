import { describe, expect, it, vi } from "vitest";
import {
  nearestUtcHour,
  openMeteoWeatherService,
  roundCoords,
  staticWeatherService,
} from "./service";
import { weatherAttribution } from "./attribution";

const NOW = new Date("2026-10-25T08:20:00Z");
const MANILA = { lat: 14.599512, lon: 120.984222 };

function fakeFetch(body: unknown, ok = true) {
  return vi.fn(async (_url: string) => ({ ok, json: async () => body }) as Response);
}

const current = { current: { temperature_2m: 31.46, relative_humidity_2m: 74.4, weather_code: 0 } };
const hourly = (hour: string) => ({
  hourly: {
    time: [hour],
    temperature_2m: [27.04],
    relative_humidity_2m: [88],
    weather_code: [61],
  },
});

describe("roundCoords / nearestUtcHour", () => {
  it("rounds to two decimals (~1 km)", () => {
    expect(roundCoords(MANILA)).toEqual({ lat: 14.6, lon: 120.98 });
    expect(roundCoords({ lat: -33.86785, lon: 151.20732 })).toEqual({ lat: -33.87, lon: 151.21 });
  });

  it("picks the nearest UTC hour", () => {
    expect(nearestUtcHour(new Date("2026-10-25T05:29:00Z"))).toBe("2026-10-25T05:00");
    expect(nearestUtcHour(new Date("2026-10-25T05:31:00Z"))).toBe("2026-10-25T06:00");
    expect(nearestUtcHour(new Date("2026-10-31T23:45:00Z"))).toBe("2026-11-01T00:00");
  });
});

describe("openMeteoWeatherService", () => {
  it("uses current conditions for a wear within the last hour", async () => {
    const f = fakeFetch(current);
    const s = await openMeteoWeatherService(f, () => NOW).snapshot(
      MANILA,
      new Date("2026-10-25T08:00:00Z"),
    );
    expect(s).toEqual({
      temperatureC: 31.5,
      humidityPct: 74,
      condition: "clear",
      observedAt: NOW,
      provider: "open-meteo",
    });
    const url = new URL(f.mock.calls[0]![0]);
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    // Precise coordinates never leave the server.
    expect(url.searchParams.get("latitude")).toBe("14.6");
    expect(url.searchParams.get("longitude")).toBe("120.98");
  });

  it("uses the hourly reading nearest an earlier wear", async () => {
    const f = fakeFetch(hourly("2026-10-25T03:00"));
    const s = await openMeteoWeatherService(f, () => NOW).snapshot(
      MANILA,
      new Date("2026-10-25T02:50:00Z"),
    );
    expect(s).toMatchObject({
      temperatureC: 27,
      humidityPct: 88,
      condition: "rain",
      observedAt: new Date("2026-10-25T03:00:00Z"),
    });
    const url = new URL(f.mock.calls[0]![0]);
    expect(url.searchParams.get("start_hour")).toBe("2026-10-25T03:00");
    expect(url.searchParams.get("end_hour")).toBe("2026-10-25T03:00");
    expect(url.searchParams.get("timezone")).toBe("GMT");
  });

  it("returns null when the hourly reading is missing", async () => {
    const f = fakeFetch({
      hourly: {
        time: ["2026-10-25T03:00"],
        temperature_2m: [null],
        relative_humidity_2m: [80],
        weather_code: [1],
      },
    });
    expect(
      await openMeteoWeatherService(f, () => NOW).snapshot(
        MANILA,
        new Date("2026-10-25T03:00:00Z"),
      ),
    ).toBeNull();
  });

  it("returns null without calling out for a wear in the future or older than 92 days", async () => {
    const f = fakeFetch(current);
    const svc = openMeteoWeatherService(f, () => NOW);
    expect(await svc.snapshot(MANILA, new Date("2026-10-25T09:00:00Z"))).toBeNull();
    expect(await svc.snapshot(MANILA, new Date("2026-07-01T00:00:00Z"))).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("returns null on HTTP errors, malformed bodies, and network failures", async () => {
    const at = new Date("2026-10-25T08:10:00Z");
    expect(
      await openMeteoWeatherService(fakeFetch(current, false), () => NOW).snapshot(MANILA, at),
    ).toBeNull();
    expect(
      await openMeteoWeatherService(fakeFetch({ current: {} }), () => NOW).snapshot(MANILA, at),
    ).toBeNull();
    const failing = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await openMeteoWeatherService(failing, () => NOW).snapshot(MANILA, at)).toBeNull();
  });
});

describe("staticWeatherService", () => {
  it("returns fixed readings tagged as static", async () => {
    const at = new Date("2026-10-25T01:00:00Z");
    expect(await staticWeatherService().snapshot(MANILA, at)).toMatchObject({
      provider: "static",
      observedAt: at,
    });
  });
});

describe("weatherAttribution", () => {
  it("credits Open-Meteo as its licence requires", () => {
    expect(weatherAttribution("open-meteo")?.label).toBe("Weather data by Open-Meteo.com");
    expect(weatherAttribution(null)).toBeNull();
  });
});
