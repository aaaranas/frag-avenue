import { describe, it, expect } from "vitest";
import {
  addDays,
  daysBetween,
  isValidTimeZone,
  isWallTime,
  localDate,
  wallTime,
  zonedWallTimeToUtc,
} from "./time-zone";

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects junk", () => {
    expect(isValidTimeZone("Asia/Manila")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("localDate", () => {
  it("is the calendar date in the given zone, not in UTC", () => {
    // 16:30 UTC is already the next day in Manila (+8) and still the same day in New York.
    const instant = new Date("2026-03-01T16:30:00Z");
    expect(localDate(instant, "UTC")).toBe("2026-03-01");
    expect(localDate(instant, "Asia/Manila")).toBe("2026-03-02");
    expect(localDate(instant, "America/New_York")).toBe("2026-03-01");
  });

  it("handles a late-night wear west of UTC", () => {
    // 23:30 in Los Angeles on Oct 24 (PDT, -7) is 06:30 UTC on Oct 25.
    expect(localDate(new Date("2026-10-25T06:30:00Z"), "America/Los_Angeles")).toBe("2026-10-24");
  });
});

describe("wallTime", () => {
  it("formats in 24h with zero padding", () => {
    expect(wallTime(new Date("2026-01-05T01:07:00Z"), "Asia/Manila")).toBe("2026-01-05T09:07");
    expect(wallTime(new Date("2026-01-05T00:00:00Z"), "UTC")).toBe("2026-01-05T00:00");
  });
});

describe("isWallTime", () => {
  it("accepts datetime-local values and rejects impossible ones", () => {
    expect(isWallTime("2026-08-13T14:00")).toBe(true);
    expect(isWallTime("2026-02-30T10:00")).toBe(false);
    expect(isWallTime("2026-08-13T24:00")).toBe(false);
    expect(isWallTime("2026-08-13 14:00")).toBe(false);
    expect(isWallTime("2026-08-13T14:00:00")).toBe(false);
  });
});

describe("zonedWallTimeToUtc", () => {
  it("interprets the wall time in the given zone", () => {
    expect(zonedWallTimeToUtc("2026-08-13T20:00", "Asia/Manila").toISOString()).toBe(
      "2026-08-13T12:00:00.000Z",
    );
    expect(zonedWallTimeToUtc("2026-08-13T20:00", "UTC").toISOString()).toBe(
      "2026-08-13T20:00:00.000Z",
    );
  });

  it("round-trips with wallTime across zones", () => {
    for (const tz of [
      "Asia/Kolkata",
      "America/St_Johns",
      "Australia/Lord_Howe",
      "Pacific/Chatham",
    ]) {
      const wall = "2026-06-15T07:45";
      expect(wallTime(zonedWallTimeToUtc(wall, tz), tz)).toBe(wall);
    }
  });

  it("uses the correct offset on each side of a DST change", () => {
    // New York: EST (-5) in January, EDT (-4) in July.
    expect(zonedWallTimeToUtc("2026-01-15T12:00", "America/New_York").toISOString()).toBe(
      "2026-01-15T17:00:00.000Z",
    );
    expect(zonedWallTimeToUtc("2026-07-15T12:00", "America/New_York").toISOString()).toBe(
      "2026-07-15T16:00:00.000Z",
    );
  });

  it("maps a time skipped by spring-forward to one hour later", () => {
    // 2026-03-08 02:30 does not exist in New York; clocks jump 02:00 → 03:00.
    const utc = zonedWallTimeToUtc("2026-03-08T02:30", "America/New_York");
    expect(wallTime(utc, "America/New_York")).toBe("2026-03-08T03:30");
  });

  it("maps an ambiguous fall-back time to its first occurrence", () => {
    // 2026-11-01 01:30 happens twice in New York; the first is EDT (-4).
    expect(zonedWallTimeToUtc("2026-11-01T01:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
  });

  it("throws on malformed input", () => {
    expect(() => zonedWallTimeToUtc("yesterday", "UTC")).toThrow();
  });
});

describe("addDays / daysBetween", () => {
  it("does calendar arithmetic across month, year, and leap-day boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-02-01", "2026-03-01")).toBe(28);
    expect(daysBetween("2026-03-01", "2026-02-01")).toBe(-28);
    expect(daysBetween("2026-10-25", "2026-10-25")).toBe(0);
  });
});
