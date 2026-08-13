// Public surface of the analytics module.
// Pure aggregations are exported for tests + downstream reuse; the server-only
// `data.ts` is imported directly by server components / actions.
export * from "./aggregations";
export * from "./insights";
export { formatMoney, costPerWearMinor } from "./money";
