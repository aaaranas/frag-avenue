/**
 * The bottle illustrations encode three facts — silhouette, colour, and fill
 * level — and nothing on the page said so. That is a problem for everyone, not
 * only for screen-reader users: a wider bottle meaning EDT is not discoverable
 * by looking at it.
 *
 * A `<details>` keeps it out of the way for people who already know, while
 * remaining reachable by keyboard and exposed to assistive tech.
 */
export function BottleLegend({ showFill = false }: { showFill?: boolean }) {
  return (
    <details className="group mt-8 border-t border-[color:var(--rule)] pt-4">
      <summary className="cursor-pointer list-none text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)] focus-visible:text-[color:var(--fg)]">
        <span className="group-open:hidden">What the bottles show +</span>
        <span className="hidden group-open:inline">What the bottles show −</span>
      </summary>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-[11px] leading-relaxed text-[color:var(--fg-muted)] sm:grid-cols-[7rem_1fr]">
        <dt className="tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">Silhouette</dt>
        <dd>
          The shape of the real flacon where we have curated it. Otherwise it is inferred from the
          concentration — heavier concentrations get smaller, squarer flacons; lighter ones get
          taller and wider.
        </dd>

        <dt className="tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">Colour</dt>
        <dd>
          The glass or the juice where we have curated it. Otherwise it comes from the
          fragrance&rsquo;s strongest accord — pale blue for aquatic, caramel for gourmand, and so
          on.
        </dd>

        {showFill ? (
          <>
            <dt className="tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">Fill level</dt>
            <dd>
              How much is left, from the remaining volume you have recorded. Bottles with no
              recorded volume are drawn without a level rather than shown as full.
            </dd>
          </>
        ) : null}
      </dl>
      <p className="mt-4 text-[11px] text-[color:var(--fg-faint)]">
        Every bottle&rsquo;s brand, name, size, and fill level are also written beneath it, so
        nothing here is conveyed by the drawing alone.
      </p>
    </details>
  );
}
