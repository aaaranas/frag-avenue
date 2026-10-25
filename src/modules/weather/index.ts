// Public surface of the weather module. Client-safe: the providers (which make
// network calls) are server-only in "./service".
export { wmoCodeToCondition, CONDITION_LABEL, conditionLabel } from "./codes";
export type { WeatherBucket } from "./codes";
export { CoordsInput } from "./schema";
export type { Coords, WeatherService, WeatherSnapshot } from "./schema";
export { weatherAttribution } from "./attribution";
