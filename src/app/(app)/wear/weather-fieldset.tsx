"use client";

import { useState } from "react";
import { WEATHER_CONDITIONS } from "@/modules/wear-logs";
import type { WeatherBucket } from "@/modules/weather";
import { Field } from "@/components/ui/field";

type Source = "AUTO" | "MANUAL" | "";

type Defaults = {
  temperatureC: string;
  humidityPct: string;
  weatherCondition: (typeof WEATHER_CONDITIONS)[number] | "";
};

type FetchState = "idle" | "locating" | "loading" | "denied" | "unavailable";

function conditionLabel(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

const selectClass = "field-input";
const labelClass = "field-label";
const legendClass = "field-label";

export function WeatherFieldset({
  defaults,
  fieldErrors,
}: {
  defaults: Defaults;
  fieldErrors: Record<string, string>;
}) {
  const [temp, setTemp] = useState(defaults.temperatureC);
  const [humidity, setHumidity] = useState(defaults.humidityPct);
  const [condition, setCondition] = useState<Defaults["weatherCondition"]>(
    defaults.weatherCondition,
  );
  const [source, setSource] = useState<Source>("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");

  const markManual = () => setSource((prev) => (prev === "AUTO" ? "MANUAL" : prev));

  const requestAutoFill = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFetchState("unavailable");
      return;
    }
    setFetchState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setFetchState("loading");
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            setFetchState("unavailable");
            return;
          }
          const data = (await res.json()) as {
            temperatureC: number;
            humidityPct: number;
            condition: WeatherBucket | null;
          };
          setTemp(String(data.temperatureC));
          setHumidity(String(data.humidityPct));
          setCondition((data.condition ?? "") as Defaults["weatherCondition"]);
          setSource("AUTO");
          setFetchState("idle");
        } catch {
          setFetchState("unavailable");
        }
      },
      () => setFetchState("denied"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  const statusMessage =
    fetchState === "locating"
      ? "Finding your location…"
      : fetchState === "loading"
        ? "Fetching weather…"
        : fetchState === "denied"
          ? "Location denied — enter weather manually."
          : fetchState === "unavailable"
            ? "Weather auto-fill unavailable — enter manually."
            : null;

  return (
    <fieldset className="border-t border-[color:var(--rule)] pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <legend className={legendClass}>Weather</legend>
        <button
          type="button"
          onClick={requestAutoFill}
          disabled={fetchState === "locating" || fetchState === "loading"}
          className="rounded-sm border border-[color:var(--rule-strong)] px-3 py-1 text-xs hover:bg-[color:var(--bg-elev)] disabled:opacity-60"
        >
          {source === "AUTO" ? "Refresh location" : "Use my location"}
        </button>
      </div>

      <input type="hidden" name="weatherSource" value={source} />

      <div className="grid grid-cols-3 gap-4">
        <Field
          name="temperatureC"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={-50}
          max={60}
          value={temp}
          onChange={(e) => {
            setTemp(e.target.value);
            markManual();
          }}
          label="Temp (°C)"
          error={fieldErrors.temperatureC}
        />
        <Field
          name="humidityPct"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={humidity}
          onChange={(e) => {
            setHumidity(e.target.value);
            markManual();
          }}
          label="Humidity (%)"
          error={fieldErrors.humidityPct}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="w-cond" className={labelClass}>
            Condition
          </label>
          <select
            id="w-cond"
            name="weatherCondition"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value as Defaults["weatherCondition"]);
              markManual();
            }}
            className={selectClass}
          >
            <option value="">—</option>
            {WEATHER_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {conditionLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p aria-live="polite" className="mt-2 min-h-4 text-xs text-[color:var(--fg-faint)]">
        {statusMessage ?? (source === "AUTO" ? "Auto-filled from your location." : "")}
      </p>
    </fieldset>
  );
}
