"use client";

import { useEffect } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app.error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <Eyebrow>Something went wrong</Eyebrow>
      <h1 className="mt-3 font-serif text-4xl leading-tight">We hit a snag.</h1>
      <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
        The last action didn&rsquo;t complete. Your data is unchanged. Try again in a moment.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-[color:var(--fg-faint)]">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-10">
        <button
          type="button"
          onClick={reset}
          className="rounded-sm bg-[color:var(--fg)] px-5 py-2.5 text-sm font-medium tracking-wide text-[color:var(--bg)] transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
