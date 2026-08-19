import Link from "next/link";
import { currentUser } from "@/modules/auth/session";
import { Bottle } from "@/components/bottle/bottle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * The landing page's job is to show the thing, not to describe it. The previous
 * version had no product imagery at all — a numbered 01/02/03/04 panel row and a
 * list of principles, which is what every generated marketing page looks like.
 * This one puts a real shelf and a real recommendation on screen, because those
 * are the two moments that actually explain the product.
 */

/** Four bottles from the seeded catalogue, drawn with their curated appearance. */
const SHELF = [
  { color: "#3f4448", shape: "FLASK", cap: "#17171a", finish: "OPAQUE", fill: 0.62 },
  { color: "#2f4a7a", shape: "CYLINDRICAL", cap: "#c9a227", finish: "OPAQUE", fill: 0.77 },
  { color: "#c94f3d", shape: "RECTANGULAR", cap: "#c8a95c", finish: "CLEAR", fill: 0.59 },
  { color: "#5b9fd4", shape: "TAPERED", cap: "#b9c3cb", finish: "CLEAR", fill: 0.88 },
] as const;

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl leading-none">Frag Avenue</span>
          <span className="hidden text-[color:var(--fg-faint)] sm:inline">·</span>
          <span className="label-caps hidden sm:inline">Wardrobe</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open the app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Create account</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-8 pb-16 md:grid-cols-[1.1fr_1fr] md:gap-14 md:px-10 md:pt-14 md:pb-20">
        <div>
          <Badge
            variant="outline"
            className="mb-6 border-[color:var(--brand-line)] bg-[color:var(--brand-wash)] text-[color:var(--brand)]"
          >
            For people with more bottles than occasions
          </Badge>

          <h1 className="font-serif text-[2.75rem] leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl">
            You own the collection.{" "}
            <span className="text-[color:var(--brand)]">Find out what it does.</span>
          </h1>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-[color:var(--fg-muted)]">
            Log what you wear and when. After a few weeks the pattern shows up on its own — which
            bottles you reach for, which ones you have not touched since March.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/sign-up"}>
                {user ? "Open the app" : "Start your wardrobe"}
              </Link>
            </Button>
            {!user ? (
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">I have an account</Link>
              </Button>
            ) : null}
          </div>

          <p className="mt-5 text-sm text-[color:var(--fg-faint)]">
            Free, and your log stays yours.
          </p>
        </div>

        {/* The shelf. Decorative, so it is hidden from assistive tech — the
            paragraph above already says what it shows. */}
        <div aria-hidden className="relative">
          <div className="rounded-xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-8 shadow-sm md:p-10">
            <div className="flex items-end justify-center gap-3 md:gap-5">
              {SHELF.map((b, i) => (
                <Bottle
                  key={i}
                  color={b.color}
                  shape={b.shape}
                  capColor={b.cap}
                  finish={b.finish}
                  fillRatio={b.fill}
                  size={i === 1 ? 112 : 94}
                  className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.14)]"
                />
              ))}
            </div>
            <div className="mt-1 h-px w-full bg-[color:var(--rule-strong)]" />
            <p className="mt-5 text-center text-xs text-[color:var(--fg-faint)]">
              Shape follows the real flacon. Colour follows the juice. The level is how much you
              have left.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The loop                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-[color:var(--rule)] bg-[color:var(--bg-sunken)]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
          <div className="grid gap-8 md:grid-cols-3">
            <Step
              title="Add a bottle"
              body="Size, price, batch code, where you bought it. Two users owning the same fragrance keep separate bottles and separate notes."
            />
            <Step
              title="Log the wear"
              body="Sprays, occasion, how long it lasted, how much you liked it. Weather fills itself in from your location; every field is yours to overrule."
            />
            <Step
              title="Read the pattern"
              body="Cost per wear, preferred accords, seasonal swings, and the bottles quietly going untouched. All of it counted, none of it guessed."
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Proof — a real recommendation                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-16">
          <div>
            <h2 className="font-serif text-3xl leading-tight md:text-4xl">
              Every suggestion shows its working.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[color:var(--fg-muted)]">
              The advisor scores the bottles you own against today&rsquo;s weather, the occasion,
              and your own ratings. It tells you which of those pushed a bottle up the list, so you
              can disagree with it on specifics rather than in general.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[color:var(--fg-muted)]">
              Below ten logged wears it stops putting a number on anything and says so.
            </p>
          </div>

          {/* A faithful copy of what the advisor actually renders. */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 md:p-7">
              <div className="flex items-start gap-5">
                <Bottle
                  color="#2f4a7a"
                  shape="CYLINDRICAL"
                  capColor="#c9a227"
                  finish="OPAQUE"
                  fillRatio={0.77}
                  size={64}
                  className="shrink-0 drop-shadow-[0_6px_12px_rgba(0,0,0,0.12)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="label-caps">Parfums de Marly</p>
                  <p className="mt-1 font-serif text-2xl leading-tight">Layton</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numeric text-4xl leading-none font-medium text-[color:var(--brand)]">
                    77<span className="text-xl text-[color:var(--fg-faint)]">%</span>
                  </p>
                  <p className="label-caps mt-1">Match</p>
                </div>
              </div>

              <ul className="mt-6 space-y-2 border-t border-[color:var(--rule)] pt-5 text-sm text-[color:var(--fg-muted)]">
                {[
                  "aligns with your preferred woody profile",
                  "you've rated this 5.0/5 across 5 wears",
                  "you haven't worn this in 21 days",
                ].map((reason) => (
                  <li key={reason} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 h-px w-4 shrink-0 bg-[color:var(--accent-amber)]"
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Close                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-[color:var(--rule)]">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:px-10 md:py-20">
          <h2 className="font-serif text-3xl leading-tight md:text-4xl">
            Start with the bottle on your desk.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[color:var(--fg-muted)]">
            One entry is enough to begin. The rest accumulates.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={user ? "/dashboard" : "/sign-up"}>
              {user ? "Open the app" : "Create your account"}
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-[color:var(--rule)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-[color:var(--fg-faint)] md:px-10">
          <span className="font-serif text-sm text-[color:var(--fg-muted)]">Frag Avenue</span>
          <span>Weather data by Open-Meteo</span>
        </div>
      </footer>
    </main>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t-2 border-[color:var(--brand)] pt-5">
      <h3 className="font-serif text-xl leading-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--fg-muted)]">{body}</p>
    </div>
  );
}
