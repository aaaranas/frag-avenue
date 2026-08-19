"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OCCASIONS } from "@/modules/wear-logs";

type Props = {
  initialOccasion: string;
  initialTemp: string;
  initialCondition: string;
};

const selectClass = "field-input";
const labelClass = "field-label";

export function AdvisorControls({ initialOccasion, initialTemp, initialCondition }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [occasion, setOccasion] = useState(initialOccasion);
  const [temp, setTemp] = useState(initialTemp);
  const [condition, setCondition] = useState(initialCondition);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setOccasion(initialOccasion);
    setTemp(initialTemp);
    setCondition(initialCondition);
  }, [initialOccasion, initialTemp, initialCondition]);

  const push = (patch: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    router.replace(s ? `/advisor?${s}` : `/advisor`);
  };

  const requestWeather = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("Geolocation unavailable — enter weather manually.");
      return;
    }
    setStatus("Finding your location…");
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus("Fetching weather…");
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            setStatus("Weather unavailable — enter manually.");
            setPending(false);
            return;
          }
          const data = (await res.json()) as {
            temperatureC: number;
            humidityPct: number;
            condition: string | null;
          };
          const nextTemp = String(data.temperatureC);
          const nextCond = data.condition ?? "";
          setTemp(nextTemp);
          setCondition(nextCond);
          setStatus(`Auto-filled · ${data.temperatureC}°C, ${data.condition ?? "unknown"}`);
          push({ temperatureC: nextTemp, weatherCondition: nextCond });
        } catch {
          setStatus("Weather unavailable — enter manually.");
        } finally {
          setPending(false);
        }
      },
      () => {
        setStatus("Location denied — enter weather manually.");
        setPending(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  return (
    <section className="mb-10 rounded-sm border border-[color:var(--rule)]">
      <div className="grid gap-5 p-5 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="adv-occ" className={labelClass}>
            Occasion
          </label>
          <select
            id="adv-occ"
            value={occasion}
            onChange={(e) => {
              setOccasion(e.target.value);
              push({ occasion: e.target.value });
            }}
            className={selectClass}
          >
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o.charAt(0) + o.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="adv-temp" className={labelClass}>
            Temperature (°C)
          </label>
          <input
            id="adv-temp"
            type="number"
            inputMode="decimal"
            step="0.5"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            onBlur={() => push({ temperatureC: temp })}
            placeholder="—"
            className={selectClass + " tabular-nums"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="adv-cond" className={labelClass}>
            Condition
          </label>
          <select
            id="adv-cond"
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value);
              push({ weatherCondition: e.target.value });
            }}
            className={selectClass}
          >
            <option value="">—</option>
            <option value="clear">Clear</option>
            <option value="clouds">Clouds</option>
            <option value="rain">Rain</option>
            <option value="snow">Snow</option>
            <option value="storm">Storm</option>
            <option value="fog">Fog</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[color:var(--rule)] px-5 py-3">
        <p aria-live="polite" className="text-xs text-[color:var(--fg-muted)]">
          {status ?? "Use your location or enter values manually."}
        </p>
        <button
          type="button"
          onClick={requestWeather}
          disabled={pending}
          className="shrink-0 rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 text-xs hover:bg-[color:var(--bg-elev)] disabled:opacity-60"
        >
          Use my location
        </button>
      </div>
    </section>
  );
}
