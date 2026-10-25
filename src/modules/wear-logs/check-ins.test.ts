import { describe, it, expect } from "vitest";
import { checkInSummary, dueCheckIn, isCheckInOffset, type RecordedCheckIn } from "./check-ins";

const WORN = new Date("2026-10-25T08:00:00Z");
const at = (hours: number) => new Date(WORN.getTime() + hours * 60 * 60 * 1000);

describe("dueCheckIn", () => {
  it("opens nothing before 2h", () => {
    expect(dueCheckIn(WORN, [], at(0))).toBeNull();
    expect(dueCheckIn(WORN, [], at(1.99))).toBeNull();
  });

  it("opens each prompt at its offset and keeps it open until the next", () => {
    expect(dueCheckIn(WORN, [], at(2))).toBe(2);
    expect(dueCheckIn(WORN, [], at(3.9))).toBe(2);
    expect(dueCheckIn(WORN, [], at(4))).toBe(4);
    expect(dueCheckIn(WORN, [], at(7.9))).toBe(4);
    expect(dueCheckIn(WORN, [], at(8))).toBe(8);
    expect(dueCheckIn(WORN, [], at(23.9))).toBe(8);
  });

  it("closes the last prompt at 24h", () => {
    expect(dueCheckIn(WORN, [], at(24))).toBeNull();
    expect(dueCheckIn(WORN, [], at(100))).toBeNull();
  });

  it("closes a prompt once answered", () => {
    const recorded: RecordedCheckIn[] = [{ offsetHours: 2, result: "STRONG" }];
    expect(dueCheckIn(WORN, recorded, at(3))).toBeNull();
    expect(dueCheckIn(WORN, recorded, at(5))).toBe(4);
  });

  it("opens the next prompt even if an earlier one was skipped", () => {
    expect(dueCheckIn(WORN, [], at(5))).toBe(4);
  });

  it("stops all later prompts after GONE", () => {
    const gone: RecordedCheckIn[] = [{ offsetHours: 2, result: "GONE" }];
    expect(dueCheckIn(WORN, gone, at(5))).toBeNull();
    expect(dueCheckIn(WORN, gone, at(9))).toBeNull();
    const goneAt4: RecordedCheckIn[] = [
      { offsetHours: 2, result: "FAINT" },
      { offsetHours: 4, result: "GONE" },
    ];
    expect(dueCheckIn(WORN, goneAt4, at(9))).toBeNull();
  });

  it("does not open for a wear in the future", () => {
    expect(dueCheckIn(WORN, [], at(-3))).toBeNull();
  });
});

describe("checkInSummary", () => {
  it("is null with no check-ins", () => {
    expect(checkInSummary([])).toBeNull();
  });

  it("lists answers in offset order", () => {
    expect(
      checkInSummary([
        { offsetHours: 8, result: "GONE" },
        { offsetHours: 2, result: "STRONG" },
        { offsetHours: 4, result: "FAINT" },
      ]),
    ).toBe("Strong 2h · Faint 4h · Gone by 8h");
  });
});

describe("isCheckInOffset", () => {
  it("accepts only 2, 4, and 8", () => {
    expect([1, 2, 3, 4, 8, 12].filter(isCheckInOffset)).toEqual([2, 4, 8]);
  });
});
