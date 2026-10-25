import Link from "next/link";
import { notFound } from "next/navigation";
import { findFragranceById } from "@/modules/fragrances";
import { Bottle } from "@/components/bottle/bottle";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SHAPE_LABEL, bottleAppearance } from "@/lib/bottle-appearance";
import { AddToCollectionForm } from "./add-to-collection-form";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const f = await findFragranceById(id);
  if (!f) return { title: "Not found" };
  return { title: `${f.brand.name} — ${f.name}` };
}

export default async function FragranceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const f = await findFragranceById(id);
  if (!f) notFound();

  const top = f.notes.filter((n) => n.layer === "TOP").map((n) => n.note.name);
  const middle = f.notes.filter((n) => n.layer === "MIDDLE").map((n) => n.note.name);
  const base = f.notes.filter((n) => n.layer === "BASE").map((n) => n.note.name);
  const bottle = bottleAppearance({
    concentration: f.concentration,
    accords: f.accords.map((a) => ({ name: a.accord.name, strength: a.strength })),
    bottleShape: f.bottleShape,
    glassColor: f.glassColor,
    capColor: f.capColor,
    glassFinish: f.glassFinish,
  });

  return (
    <article className="mx-auto max-w-5xl">
      <Link
        href="/fragrances"
        className="inline-flex min-h-11 items-center text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
      >
        ← Fragrances
      </Link>

      {/* Hero */}
      <header className="mt-8 grid gap-8 border-b border-[color:var(--rule)] pb-12 md:grid-cols-[1fr_1.5fr] md:gap-12">
        <div className="flex flex-col items-center md:sticky md:top-8 md:self-start">
          <Bottle
            color={bottle.color}
            shape={bottle.shape}
            capColor={bottle.capColor}
            finish={bottle.finish}
            size={220}
            className="drop-shadow-[0_18px_28px_rgba(0,0,0,0.16)]"
          />
          {/* The illustration is decorative; this sentence is the content. */}
          <p className="mt-4 max-w-[22ch] text-center text-[11px] leading-relaxed text-[color:var(--fg-faint)]">
            {bottle.curatedShape
              ? `Drawn from the official ${SHAPE_LABEL[bottle.shape]}.`
              : `Silhouette inferred from the ${f.concentration} concentration; colour from its strongest accord.`}
          </p>
        </div>
        <div>
          <Eyebrow>{f.brand.name}</Eyebrow>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
            {f.name}
          </h1>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-xs tracking-wide text-[color:var(--fg-muted)]">
            <MetaItem label="Concentration" value={f.concentration} />
            {f.releaseYear ? <MetaItem label="Released" value={f.releaseYear.toString()} /> : null}
            {f.perfumer ? <MetaItem label="Perfumer" value={f.perfumer} /> : null}
            <MetaItem label="Class" value={genderLabel(f.gender)} />
          </dl>

          {f.accords.length > 0 ? (
            <div className="mt-8">
              <Eyebrow>Accords</Eyebrow>
              <ul className="mt-3 flex flex-wrap gap-2">
                {f.accords.map((a) => (
                  <li key={a.accord.id}>
                    <Chip title={`Strength ${a.strength}/5`}>
                      {a.accord.name}
                      <span className="ml-1.5 text-[color:var(--fg-faint)]">
                        {"·".repeat(a.strength)}
                      </span>
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-12 pt-10 md:grid-cols-[1.4fr_1fr] md:gap-16">
        <section>
          <Eyebrow>Composition</Eyebrow>
          <div className="mt-4 flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
            <NoteRow label="Top" notes={top} />
            <NoteRow label="Heart" notes={middle} />
            <NoteRow label="Base" notes={base} />
          </div>
        </section>

        <aside className="min-w-0">
          <section className="rounded-sm border border-[color:var(--rule)] p-5">
            <Eyebrow>Add to your wardrobe</Eyebrow>
            <div className="mt-4">
              <AddToCollectionForm fragranceId={f.id} />
            </div>
          </section>

          <p className="mt-5 text-xs text-[color:var(--fg-muted)]">
            Just trying a sample?{" "}
            <Link
              href={{ pathname: "/wear/new", query: { fragranceId: f.id } }}
              className="link-editorial"
            >
              Log a sample wear
            </Link>{" "}
            without adding a bottle.
          </p>
        </aside>
      </div>
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[color:var(--fg)]">{value}</dd>
    </div>
  );
}

function NoteRow({ label, notes }: { label: string; notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="grid grid-cols-[6rem_1fr] items-baseline gap-6 py-4">
      <dt className="text-[10px] font-medium tracking-[0.22em] text-[color:var(--fg-faint)] uppercase">
        {label}
      </dt>
      <dd className="font-serif text-lg leading-snug text-[color:var(--fg)] italic">
        {notes.join(", ")}
      </dd>
    </div>
  );
}

function genderLabel(g: string): string {
  switch (g) {
    case "MASCULINE":
      return "Masculine";
    case "FEMININE":
      return "Feminine";
    default:
      return "Unisex";
  }
}
