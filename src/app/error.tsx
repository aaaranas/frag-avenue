"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
        Something went wrong
      </h1>
      <p className="mt-2 text-[color:var(--fg-muted)]">
        This screen didn&rsquo;t load. Try again, or go back to your feed.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-[color:var(--fg-faint)]">Error reference {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/feed">Go to your feed</Link>
        </Button>
      </div>
    </div>
  );
}
