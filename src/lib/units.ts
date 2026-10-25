/**
 * Display-unit conversion. Storage is always metric (°C, ml); convert only at
 * the edge, for display.
 */

export type UnitSystem = "METRIC" | "IMPERIAL";

const ML_PER_US_FL_OZ = 29.5735295625;

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_US_FL_OZ;
}

/** Whole degrees: "21°C" / "70°F". */
export function formatTemperature(celsius: number, units: UnitSystem): string {
  if (units === "IMPERIAL") return `${Math.round(celsiusToFahrenheit(celsius))}°F`;
  return `${Math.round(celsius)}°C`;
}

/** "100 ml" / "3.4 fl oz". */
export function formatVolume(ml: number, units: UnitSystem): string {
  if (units === "IMPERIAL") return `${(Math.round(mlToFlOz(ml) * 10) / 10).toFixed(1)} fl oz`;
  return `${Math.round(ml)} ml`;
}
