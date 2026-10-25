import { describe, expect, it } from "vitest";
import { Username } from "./username";

const ok = (v: string) => Username.safeParse(v);

describe("Username", () => {
  it("normalises case, whitespace, and a leading @", () => {
    expect(Username.parse("  @Andrea_87 ")).toBe("andrea_87");
  });

  it("accepts 3–20 letters, digits, and underscores starting with a letter", () => {
    expect(ok("abc").success).toBe(true);
    expect(ok("a".repeat(20)).success).toBe(true);
    for (const bad of ["ab", "a".repeat(21), "1abc", "_abc", "ab-c", "ab c", "abç"]) {
      expect(ok(bad).success, bad).toBe(false);
    }
  });

  it("rejects reserved names in any case", () => {
    for (const r of ["admin", "Feed", "SUPPORT", "fragavenue"]) {
      expect(ok(r).success, r).toBe(false);
    }
  });
});
