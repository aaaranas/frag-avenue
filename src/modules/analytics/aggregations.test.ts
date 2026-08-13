import { describe, it, expect } from "vitest";
import {
  sumCollectionValueByCurrency,
  sumBottleVolumeMl,
  sumSprays,
  topWornFragrances,
  neglectedFragrances,
  type CollectionItemInput,
  type WearInput,
} from "./aggregations";

const DAY = 24 * 60 * 60 * 1000;

function item(overrides: Partial<CollectionItemInput> = {}): CollectionItemInput {
  return {
    id: "c1",
    fragranceId: "f1",
    fragranceName: "Aventus",
    brandName: "Creed",
    bottleSizeMl: 100,
    purchasePriceMinor: 30000,
    currency: "USD",
    createdAt: new Date("2020-01-01T00:00:00Z"),
    ...overrides,
  };
}

function wear(overrides: Partial<WearInput> = {}): WearInput {
  return {
    id: "w1",
    wornAt: new Date("2026-08-01T09:00:00Z"),
    sprays: 4,
    fragranceId: "f1",
    fragranceName: "Aventus",
    brandName: "Creed",
    ...overrides,
  };
}

describe("sumCollectionValueByCurrency", () => {
  it("groups by currency and never invents FX", () => {
    const out = sumCollectionValueByCurrency([
      item({ id: "a", currency: "USD", purchasePriceMinor: 15000 }),
      item({ id: "b", currency: "USD", purchasePriceMinor: 30000 }),
      item({ id: "c", currency: "EUR", purchasePriceMinor: 12000 }),
    ]);
    expect(out).toEqual([
      { currency: "EUR", amountMinor: 12000 },
      { currency: "USD", amountMinor: 45000 },
    ]);
  });

  it("excludes rows with null price OR null currency", () => {
    const out = sumCollectionValueByCurrency([
      item({ id: "a", purchasePriceMinor: null, currency: "USD" }),
      item({ id: "b", purchasePriceMinor: 10000, currency: null }),
      item({ id: "c", purchasePriceMinor: 5000, currency: "USD" }),
    ]);
    expect(out).toEqual([{ currency: "USD", amountMinor: 5000 }]);
  });

  it("returns an empty array when nothing qualifies", () => {
    expect(sumCollectionValueByCurrency([])).toEqual([]);
  });
});

describe("sumBottleVolumeMl", () => {
  it("sums positive bottle sizes and ignores non-positive rows", () => {
    expect(
      sumBottleVolumeMl([
        item({ bottleSizeMl: 100 }),
        item({ bottleSizeMl: 50 }),
        item({ bottleSizeMl: 0 }),
      ]),
    ).toBe(150);
  });
});

describe("sumSprays", () => {
  it("sums sprays defensively", () => {
    expect(sumSprays([wear({ sprays: 4 }), wear({ sprays: 6 })])).toBe(10);
  });
});

describe("topWornFragrances", () => {
  it("ranks by wear count, tie-breaks alphabetically", () => {
    const out = topWornFragrances(
      [
        wear({ fragranceId: "a", fragranceName: "Aventus" }),
        wear({ fragranceId: "a", fragranceName: "Aventus" }),
        wear({ fragranceId: "b", fragranceName: "Bleu de Chanel", brandName: "Chanel" }),
        wear({ fragranceId: "b", fragranceName: "Bleu de Chanel", brandName: "Chanel" }),
        wear({ fragranceId: "c", fragranceName: "Layton", brandName: "PdM" }),
      ],
      3,
    );
    expect(out.map((r) => [r.name, r.wears])).toEqual([
      ["Aventus", 2],
      ["Bleu de Chanel", 2],
      ["Layton", 1],
    ]);
  });

  it("returns an empty array on no wears", () => {
    expect(topWornFragrances([], 3)).toEqual([]);
  });
});

describe("neglectedFragrances", () => {
  const NOW = new Date("2026-08-13T00:00:00Z");
  const longAgo = new Date(NOW.getTime() - 200 * DAY);
  const recentBuy = new Date(NOW.getTime() - 30 * DAY);
  const wornRecently = new Date(NOW.getTime() - 10 * DAY);
  const wornLongAgo = new Date(NOW.getTime() - 120 * DAY);

  it("skips fragrances owned for less than 90 days", () => {
    const out = neglectedFragrances(
      [item({ fragranceId: "f1", createdAt: recentBuy })],
      [{ fragranceId: "f1", lastWornAt: null }],
      NOW,
    );
    expect(out).toEqual([]);
  });

  it("skips fragrances worn within the last 60 days", () => {
    const out = neglectedFragrances(
      [item({ fragranceId: "f1", createdAt: longAgo })],
      [{ fragranceId: "f1", lastWornAt: wornRecently }],
      NOW,
    );
    expect(out).toEqual([]);
  });

  it("returns never-worn AND long-silent, never-worn first", () => {
    const out = neglectedFragrances(
      [
        item({ fragranceId: "f1", fragranceName: "Aventus", createdAt: longAgo }),
        item({ fragranceId: "f2", fragranceName: "Layton", createdAt: longAgo }),
      ],
      [
        { fragranceId: "f1", lastWornAt: wornLongAgo }, // 120 days ago
        { fragranceId: "f2", lastWornAt: null }, // never worn
      ],
      NOW,
    );
    expect(out.map((r) => [r.name, r.daysSinceLastWear])).toEqual([
      ["Layton", null],
      ["Aventus", 120],
    ]);
  });

  it("dedupes by fragranceId across multiple bottles", () => {
    const out = neglectedFragrances(
      [
        item({ id: "a", fragranceId: "f1", createdAt: longAgo }),
        item({ id: "b", fragranceId: "f1", createdAt: longAgo }),
      ],
      [{ fragranceId: "f1", lastWornAt: null }],
      NOW,
    );
    expect(out).toHaveLength(1);
  });

  it("respects the limit", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      item({ id: `c${i}`, fragranceId: `f${i}`, fragranceName: `Name${i}`, createdAt: longAgo }),
    );
    const lastWorn = items.map((i) => ({ fragranceId: i.fragranceId, lastWornAt: null }));
    expect(neglectedFragrances(items, lastWorn, NOW, 2)).toHaveLength(2);
  });
});
