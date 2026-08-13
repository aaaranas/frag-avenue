import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { takeToken, _resetRateLimitStore } from "./rate-limit";

describe("takeToken", () => {
  beforeEach(() => {
    _resetRateLimitStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to `limit` requests, then blocks", () => {
    for (let i = 0; i < 5; i++) {
      expect(takeToken("k", 5, 60_000).allowed).toBe(true);
    }
    const r = takeToken("k", 5, 60_000);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refills proportionally over the window", () => {
    for (let i = 0; i < 5; i++) takeToken("k", 5, 60_000);
    expect(takeToken("k", 5, 60_000).allowed).toBe(false);

    // Advance half the window → ~2.5 tokens back.
    vi.advanceTimersByTime(30_000);
    expect(takeToken("k", 5, 60_000).allowed).toBe(true);
    expect(takeToken("k", 5, 60_000).allowed).toBe(true);
    expect(takeToken("k", 5, 60_000).allowed).toBe(false);
  });

  it("fully refills after the window", () => {
    for (let i = 0; i < 5; i++) takeToken("k", 5, 60_000);
    vi.advanceTimersByTime(60_000);
    for (let i = 0; i < 5; i++) {
      expect(takeToken("k", 5, 60_000).allowed).toBe(true);
    }
  });

  it("keys are isolated", () => {
    for (let i = 0; i < 5; i++) takeToken("a", 5, 60_000);
    expect(takeToken("a", 5, 60_000).allowed).toBe(false);
    expect(takeToken("b", 5, 60_000).allowed).toBe(true);
  });

  it("retryAfterSeconds is at least 1", () => {
    for (let i = 0; i < 5; i++) takeToken("k", 5, 60_000);
    const r = takeToken("k", 5, 60_000);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });
});
