"use client";

import { useCallback, useEffect, useState } from "react";
import { CONDITION_LABEL, type WeatherBucket } from "@/modules/weather";
import { formatTemperature, type UnitSystem } from "@/lib/units";

type Preview = { temperatureC: number; humidityPct: number; condition: WeatherBucket | null };
type State =
  | { kind: "locating" }
  | { kind: "ready"; lat: number; lon: number; preview: Preview | null }
  | { kind: "off"; reason: string }
  | { kind: "removed" };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Asks the browser for a location so the server can attach a weather snapshot.
 * Sends only rounded coordinates (~1 km) as hidden fields; the server fetches
 * the weather for the wear's time and stores the reading, not the location.
 * The preview shows current conditions.
 */
export function WeatherCapture({ units }: { units: UnitSystem }) {
  const [state, setState] = useState<State>({ kind: "locating" });

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ kind: "off", reason: "This browser can't share a location." });
      return;
    }
    setState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = round2(pos.coords.latitude);
        const lon = round2(pos.coords.longitude);
        setState({ kind: "ready", lat, lon, preview: null });
        try {
          const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
          if (res.ok) setState({ kind: "ready", lat, lon, preview: (await res.json()) as Preview });
        } catch {
          /* preview is optional; the server still tries at submit */
        }
      },
      () => setState({ kind: "off", reason: "Location is off, so no weather will be attached." }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    );
  }, []);

  useEffect(() => locate(), [locate]);

  return (
    <div
      role="group"
      aria-labelledby="weather-label"
      className="rounded-md border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-3 text-sm"
    >
      <p id="weather-label" className="field-label">
        Weather
      </p>
      {state.kind === "ready" ? (
        <>
          <input type="hidden" name="lat" value={state.lat} />
          <input type="hidden" name="lon" value={state.lon} />
        </>
      ) : null}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <p className="text-[color:var(--fg-muted)]">
          {state.kind === "locating" && "Finding your local weather…"}
          {state.kind === "ready" &&
            (state.preview
              ? `Now ${formatTemperature(state.preview.temperatureC, units)} · ${state.preview.humidityPct}% humidity${
                  state.preview.condition ? ` · ${CONDITION_LABEL[state.preview.condition]}` : ""
                }. Weather for the time you wore it will be attached.`
              : "Weather for the time you wore it will be attached.")}
          {state.kind === "off" && state.reason}
          {state.kind === "removed" && "No weather will be attached."}
        </p>
        {state.kind === "ready" || state.kind === "locating" ? (
          // Offered while locating too: a browser that never answers the
          // permission prompt must not leave the user stuck waiting.
          <button
            type="button"
            onClick={() => setState({ kind: "removed" })}
            className="min-h-11 px-2 text-sm underline underline-offset-4"
          >
            Don&rsquo;t attach
          </button>
        ) : state.kind === "off" || state.kind === "removed" ? (
          <button
            type="button"
            onClick={locate}
            className="min-h-11 px-2 text-sm underline underline-offset-4"
          >
            {state.kind === "removed" ? "Attach weather" : "Try again"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
