import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { CONCENTRATION_LABEL } from "@/modules/fragrances";
import { findFragranceById } from "@/modules/fragrances/data";
import { addToWardrobeAction } from "@/modules/wardrobe";
import { findUserPreferences } from "@/modules/users/data";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { WardrobeItemForm } from "@/components/wardrobe/wardrobe-item-form";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/fragrances/${id}`);
  const f = await findFragranceById(user.id, id);
  return { title: f ? `${f.brand.name} ${f.name}` : "Not found" };
}

export default async function FragranceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/fragrances/${id}`);
  const [f, prefs] = await Promise.all([
    findFragranceById(user.id, id),
    findUserPreferences(user.id),
  ]);
  // Missing, or another user's pending submission: both are simply not found.
  if (!f) notFound();

  const layers = [
    { label: "Top", notes: f.notes.filter((n) => n.layer === "TOP") },
    { label: "Heart", notes: f.notes.filter((n) => n.layer === "MIDDLE") },
    { label: "Base", notes: f.notes.filter((n) => n.layer === "BASE") },
  ].filter((l) => l.notes.length > 0);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/fragrances"
        className="inline-flex min-h-11 items-center text-sm text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
      >
        ← Catalogue
      </Link>

      <header className="mt-4 flex flex-col gap-6 border-b border-[color:var(--rule)] pb-8 sm:flex-row sm:items-end">
        <FragranceThumb imagePath={f.imagePath} size="lg" />
        <div className="min-w-0">
          <Eyebrow>{f.brand.name}</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{f.name}</h1>
          {f.status === "PENDING" ? (
            <p className="mt-2 inline-flex rounded-full border border-[color:var(--rule-strong)] px-2.5 py-0.5 text-xs text-[color:var(--fg-muted)]">
              Pending review · only you can see this
            </p>
          ) : null}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <MetaItem
              label="Concentration"
              value={
                CONCENTRATION_LABEL[f.concentration as keyof typeof CONCENTRATION_LABEL] ??
                f.concentration
              }
            />
            {f.releaseYear ? <MetaItem label="Released" value={f.releaseYear.toString()} /> : null}
            {f.perfumer ? <MetaItem label="Perfumer" value={f.perfumer} /> : null}
          </dl>
        </div>
      </header>

      {f.accords.length > 0 || layers.length > 0 ? (
        <section
          aria-labelledby="profile-heading"
          className="border-b border-[color:var(--rule)] py-8"
        >
          <h2 id="profile-heading" className="text-lg font-semibold">
            Scent profile
          </h2>
          {f.accords.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Accords">
              {f.accords.map((a) => (
                <li key={a.accord.id}>
                  <Chip title={`Strength ${a.strength} of 5`}>{a.accord.name}</Chip>
                </li>
              ))}
            </ul>
          ) : null}
          {layers.length > 0 ? (
            <dl className="mt-6 flex flex-col divide-y divide-[color:var(--rule)] border-y border-[color:var(--rule)]">
              {layers.map((l) => (
                <div key={l.label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-3">
                  <dt className="text-sm text-[color:var(--fg-muted)]">{l.label}</dt>
                  <dd className="text-sm">{l.notes.map((n) => n.note.name).join(", ")}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="add-heading" className="py-8">
        <h2 id="add-heading" className="mb-4 text-lg font-semibold">
          Add to your wardrobe
        </h2>
        <WardrobeItemForm
          action={addToWardrobeAction}
          fragranceId={f.id}
          submitLabel="Add to wardrobe"
          defaults={{
            kind: "BOTTLE",
            bottleSizeMl: "",
            remainingMl: "",
            priceDecimal: "",
            currency: prefs?.defaultCurrency ?? "",
            purchaseDate: "",
            personalNotes: "",
          }}
        />
      </section>
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[color:var(--fg-muted)]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
