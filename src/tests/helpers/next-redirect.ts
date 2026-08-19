import { expect, vi } from "vitest";

/**
 * `next/navigation`'s `redirect()` works by throwing, and every server action in
 * this app ends in either a redirect (success) or a returned FormState
 * (failure). Tests therefore have to treat "it threw" as the success signal,
 * which is easy to get backwards — hence this helper rather than a bare
 * try/catch at each call site.
 *
 * Real Next tags the thrown error with a `NEXT_REDIRECT;...` digest. We mirror
 * the shape closely enough that a test asserting on the destination is
 * asserting on the same thing production does.
 */
export class RedirectError extends Error {
  readonly digest: string;

  constructor(readonly url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.name = "RedirectError";
    this.digest = `NEXT_REDIRECT;replace;${url};307;`;
  }
}

/** Drop-in for `next/navigation`'s `redirect`. Never returns. */
export function redirectMock(url: string): never {
  throw new RedirectError(url);
}

/**
 * Asserts the call redirected, and returns the destination so the caller can
 * make a more specific assertion. Fails loudly when the action returned
 * normally — that is the "success path silently did nothing" bug.
 */
export async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    const result = await promise;
    expect.fail(`Expected a redirect, but the action returned ${JSON.stringify(result)} instead.`);
  } catch (err) {
    if (err instanceof RedirectError) return err.url;
    throw err;
  }
}

/**
 * Kept here so every action test redirects the same way. `vi.mock` factories are
 * hoisted above the file's imports, so this cannot be referenced directly —
 * pull it in from inside an async factory:
 *
 *   vi.mock("next/navigation", async () =>
 *     (await import("@/tests/helpers/next-redirect")).nextNavigationMock(),
 *   );
 */
export function nextNavigationMock() {
  return {
    redirect: vi.fn(redirectMock),
    notFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
  };
}

/** Builds a FormData from a plain record; `undefined` entries are omitted. */
export function formData(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.set(k, v);
  }
  return fd;
}
