import { describe, it, expect } from "vitest";
import { WearFormInput, deriveWeatherSource, toPersistenceInput } from "./schema";

const base = {
  fragranceId: "clx000abc",
  wornAt: "2026-08-13T14:00",
  sprays: "4",
};

describe("WearFormInput", () => {
  it("accepts the minimum required input and applies enum defaults", () => {
    const r = WearFormInput.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.occasion).toBe("CASUAL");
      expect(r.data.environment).toBe("MIXED");
      expect(r.data.sprays).toBe(4);
      expect(r.data.wornAt).toBeInstanceOf(Date);
    }
  });

  it("rejects out-of-range sprays", () => {
    expect(WearFormInput.safeParse({ ...base, sprays: "0" }).success).toBe(false);
    expect(WearFormInput.safeParse({ ...base, sprays: "21" }).success).toBe(false);
  });

  it("collapses empty optional weather fields to undefined", () => {
    const r = WearFormInput.parse({
      ...base,
      temperatureC: "",
      humidityPct: "",
      weatherCondition: "",
      longevityHours: "",
      projection: "",
      enjoyment: "",
      notes: "",
    });
    expect(r.temperatureC).toBeUndefined();
    expect(r.humidityPct).toBeUndefined();
    expect(r.weatherCondition).toBeUndefined();
    expect(r.longevityHours).toBeUndefined();
    expect(r.projection).toBeUndefined();
    expect(r.enjoyment).toBeUndefined();
    expect(r.notes).toBeUndefined();
  });

  it("rejects unknown weather condition strings", () => {
    const r = WearFormInput.safeParse({ ...base, weatherCondition: "sleet" });
    expect(r.success).toBe(false);
  });

  it("rejects out-of-range projection / enjoyment", () => {
    expect(WearFormInput.safeParse({ ...base, projection: "6" }).success).toBe(false);
    expect(WearFormInput.safeParse({ ...base, enjoyment: "0" }).success).toBe(false);
  });
});

describe("deriveWeatherSource", () => {
  it("returns NONE when no weather field is set", () => {
    expect(deriveWeatherSource({})).toBe("NONE");
    expect(deriveWeatherSource({ sourceHint: "AUTO" })).toBe("NONE");
  });

  it("defaults to MANUAL when any weather field is set without a hint", () => {
    expect(deriveWeatherSource({ temperatureC: 20 })).toBe("MANUAL");
    expect(deriveWeatherSource({ humidityPct: 60 })).toBe("MANUAL");
    expect(deriveWeatherSource({ weatherCondition: "clear" })).toBe("MANUAL");
  });

  it("honours an explicit AUTO hint when weather is present", () => {
    expect(deriveWeatherSource({ temperatureC: 20, sourceHint: "AUTO" })).toBe("AUTO");
  });

  it("honours an explicit MANUAL hint (form was auto-filled then edited)", () => {
    expect(deriveWeatherSource({ temperatureC: 20, sourceHint: "MANUAL" })).toBe("MANUAL");
  });

  it("treats an empty-string weather condition as unset", () => {
    expect(deriveWeatherSource({ weatherCondition: "" })).toBe("NONE");
  });
});

describe("toPersistenceInput", () => {
  it("promotes optional fields to explicit null and stamps weatherSource", () => {
    const parsed = WearFormInput.parse({ ...base, temperatureC: "22", weatherCondition: "clear" });
    const p = toPersistenceInput(parsed);
    expect(p.temperatureC).toBe(22);
    expect(p.weatherCondition).toBe("clear");
    expect(p.weatherSource).toBe("MANUAL");
    expect(p.humidityPct).toBeNull();
    expect(p.longevityHours).toBeNull();
    expect(p.notes).toBeNull();
  });

  it("weatherSource is NONE when no weather was entered", () => {
    const parsed = WearFormInput.parse(base);
    const p = toPersistenceInput(parsed);
    expect(p.weatherSource).toBe("NONE");
  });
});
