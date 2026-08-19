import { vi } from "vitest";

/**
 * jsdom has no `window.matchMedia`. Components that pick a layout from
 * breakpoints need one, and they need it to answer for a *specific* viewport so
 * the test can pin behaviour that only shows up at a given column count.
 *
 * `stubViewportWidth(1280)` makes every `(min-width: N)` query answer as though
 * the viewport were 1280px wide. Listeners are accepted and ignored — nothing
 * here resizes mid-test.
 */
export function stubViewportWidth(width: number): void {
  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => {
    const min = /\(min-width:\s*(\d+)px\)/.exec(query);
    const matches = min ? width >= Number(min[1]) : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    } as unknown as MediaQueryList;
  });
}

/** Viewport widths that map to the grid's column counts. */
export const VIEWPORT = {
  /** < 768px — 2 columns */
  mobile: 640,
  /** ≥ 768px — 3 columns */
  tablet: 800,
  /** ≥ 1024px — 4 columns */
  desktop: 1280,
} as const;
