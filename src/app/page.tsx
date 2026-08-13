import Link from "next/link";
import { currentUser } from "@/modules/auth/session";
import { Eyebrow } from "@/components/ui/eyebrow";

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 md:px-10">
      {/* Header */}
      <header className="flex items-center justify-between pt-8 md:pt-12">
        <div>
          <Eyebrow>Frag Avenue</Eyebrow>
          <p className="mt-1 font-serif text-lg leading-none italic">Wardrobe</p>
        </div>
        <nav className="text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-sm border border-[color:var(--rule-strong)] px-4 py-2 text-xs tracking-wide uppercase hover:bg-[color:var(--vellum,#eeeae1)] dark:hover:bg-[color:var(--bg-elev)]"
            >
              Enter
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="link-editorial text-xs tracking-wide uppercase">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-sm border border-[color:var(--rule-strong)] px-4 py-2 text-xs tracking-wide uppercase hover:bg-[color:var(--vellum,#eeeae1)] dark:hover:bg-[color:var(--bg-elev)]"
              >
                Create account
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-24 md:pt-40 md:pb-32">
        <p className="max-w-xl text-sm leading-relaxed text-[color:var(--fg-muted)]">
          A fragrance wardrobe and personal fragrance analytics platform.
        </p>
        <h1 className="mt-6 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Your wardrobe,
          <br />
          <span className="text-[color:var(--fg-muted)] italic">quantified.</span>
        </h1>
        <p className="mt-8 max-w-lg text-base leading-relaxed text-[color:var(--fg-muted)]">
          Track what you own. Log what you wear. Learn what actually works — for your skin, your
          climate, and your day.
        </p>

        <div className="mt-12 flex items-center gap-6">
          <Link
            href={user ? "/dashboard" : "/sign-up"}
            className="rounded-sm bg-[color:var(--fg)] px-6 py-3 text-sm font-medium tracking-wide text-[color:var(--bg)] transition hover:opacity-90"
          >
            {user ? "Enter the app" : "Create your account"}
          </Link>
          {!user ? (
            <Link href="/sign-in" className="link-editorial text-sm">
              Sign in
            </Link>
          ) : null}
        </div>
      </section>

      {/* Manifesto */}
      <section className="border-t border-[color:var(--rule)] py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-4 md:gap-8">
          <Panel n="01" title="Collect">
            A personal catalogue, separate from the canonical fragrance record. Size, batch, source,
            condition.
          </Panel>
          <Panel n="02" title="Record">
            Every wear — sprays, occasion, weather, longevity, projection, enjoyment. Weather
            auto-fills; you overrule.
          </Panel>
          <Panel n="03" title="Learn">
            Preferred accords, seasonal patterns, weather correlations, cost per wear. Deterministic
            statistics, never invented.
          </Panel>
          <Panel n="04" title="Recommend">
            A five-factor advisor with named reasons. Cold-start aware. No fake precision.
          </Panel>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-[color:var(--rule)] py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <Eyebrow>Principles</Eyebrow>
            <h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">
              Signal, not narrative.
            </h2>
          </div>
          <ul className="flex flex-col gap-4 text-sm leading-relaxed text-[color:var(--fg-muted)]">
            <li>
              <span className="text-[color:var(--fg)]">Explainable by design.</span> Every score is
              decomposed into named sub-scores.
            </li>
            <li>
              <span className="text-[color:var(--fg)]">No LLM narration.</span> Reasons are derived
              from the actual numbers, never post-hoc prose.
            </li>
            <li>
              <span className="text-[color:var(--fg)]">Cold-start honest.</span> When data is thin,
              the app says so and adapts. It doesn&rsquo;t invent precision.
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-[color:var(--rule)] py-8 text-xs text-[color:var(--fg-faint)]">
        Foundation build · MVP complete
      </footer>
    </main>
  );
}

function Panel({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-serif text-2xl text-[color:var(--color-accent)] italic tabular-nums">
        {n}
      </p>
      <p className="mt-2 text-sm font-medium tracking-wide text-[color:var(--fg)] uppercase">
        {title}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--fg-muted)]">{children}</p>
    </div>
  );
}
