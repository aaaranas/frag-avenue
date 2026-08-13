import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function WearNotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <Eyebrow>404</Eyebrow>
      <h1 className="mt-3 font-serif text-4xl leading-tight">Not found.</h1>
      <p className="mt-4 text-sm text-[color:var(--fg-muted)]">
        This wear isn&apos;t in your journal, or it no longer exists.
      </p>
      <Link
        href="/wear"
        className="mt-8 inline-block rounded-sm border border-[color:var(--rule-strong)] px-4 py-2 text-sm hover:bg-[color:var(--bg-elev)]"
      >
        Back to journal
      </Link>
    </div>
  );
}
