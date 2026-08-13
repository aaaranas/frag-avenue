/**
 * Money utilities. Prices are integer minor units + ISO 4217 currency code.
 * Never store money as a float; formatting for display happens here.
 */

export type Money = { amountMinor: number; currency: string };

export function formatMoney(money: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(money.amountMinor / 100);
}

/**
 * Cost per wear: purchasePriceMinor / wearCount, in minor units.
 * Returns null when wearCount < 1 — the UI displays "—" rather than 0 or ∞.
 */
export function costPerWearMinor(purchasePriceMinor: number, wearCount: number): number | null {
  if (!Number.isFinite(purchasePriceMinor) || purchasePriceMinor <= 0) return null;
  if (!Number.isInteger(wearCount) || wearCount < 1) return null;
  return Math.round(purchasePriceMinor / wearCount);
}
