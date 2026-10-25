import { describe, expect, it } from "vitest";
import { formatDateTime, formatTime } from "./format";

describe("format", () => {
  const instant = new Date("2026-10-25T12:00:00Z");
  it("formats in the given zone, not the server's", () => {
    expect(formatDateTime(instant, "Asia/Manila")).toBe("Sun, Oct 25, 8:00 PM");
    expect(formatDateTime(instant, "America/Los_Angeles")).toBe("Sun, Oct 25, 5:00 AM");
    expect(formatTime(instant, "UTC")).toBe("12:00 PM");
  });
});
