import { describe, it, expect, vi } from "vitest";
import { buildShareCard, formatShareWhen, type ShareWearInput } from "./share-card";

// The wear-logs barrel also exports its server actions, which need a server.
vi.mock("@/modules/wear-logs/actions", () => ({}));

const wear: ShareWearInput = {
  // 00:30 UTC on the 25th is 8:30 AM on the 25th in Manila.
  wornAt: new Date("2026-10-25T00:30:00Z"),
  timeZone: "Asia/Manila",
  sprays: 6,
  occasion: "WORK",
  mood: "CONFIDENT",
  temperatureC: 32,
  fragrance: {
    name: "Hawas Ice",
    imagePath: "/catalog/rasasi-hawas-ice.webp",
    brand: { name: "Rasasi" },
  },
  user: { username: "dev" },
  checkIns: [
    { offsetHours: 4, result: "FAINT" },
    { offsetHours: 2, result: "STRONG" },
  ],
};

describe("formatShareWhen", () => {
  it("formats the moment in the wear's own zone", () => {
    expect(formatShareWhen(wear.wornAt, "Asia/Manila")).toBe("Sunday, Oct 25 · 8:30 AM");
    expect(formatShareWhen(wear.wornAt, "America/Los_Angeles")).toBe("Saturday, Oct 24 · 5:30 PM");
  });
});

describe("buildShareCard", () => {
  it("carries the scent, the stats, check-ins, and the handle", () => {
    expect(buildShareCard(wear, "METRIC")).toEqual({
      house: "Rasasi",
      name: "Hawas Ice",
      imagePath: "/catalog/rasasi-hawas-ice.webp",
      when: "Sunday, Oct 25 · 8:30 AM",
      stats: [
        { label: "Sprays", value: "6" },
        { label: "Occasion", value: "Work" },
        { label: "Mood", value: "Confident" },
        { label: "Temp", value: "32°C" },
      ],
      summary: "Strong 2h · Faint 4h",
      handle: "@dev",
      fileName: "frag-avenue-rasasi-hawas-ice",
    });
  });

  it("leaves out what wasn't recorded, and follows the viewer's units", () => {
    const card = buildShareCard(
      { ...wear, mood: null, temperatureC: 20, checkIns: [], user: { username: null } },
      "IMPERIAL",
    );
    expect(card.stats.map((s) => s.label)).toEqual(["Sprays", "Occasion", "Temp"]);
    expect(card.stats[2]!.value).toBe("68°F");
    expect(card.summary).toBeNull();
    expect(card.handle).toBeNull();
  });
});
