import "server-only";

let cached: readonly string[] | null = null;

/**
 * Every IANA zone the runtime knows, for a picker. `Intl.supportedValuesOf`
 * omits "UTC" in V8, and the stored value may be an alias it does not list, so
 * `ensure` is merged in to keep the current value selectable.
 */
export function selectableTimeZones(ensure?: string): readonly string[] {
  cached ??= ["UTC", ...Intl.supportedValuesOf("timeZone").filter((z) => z !== "UTC")];
  if (!ensure || cached.includes(ensure)) return cached;
  return [ensure, ...cached];
}
