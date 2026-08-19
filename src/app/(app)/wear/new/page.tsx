import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findCollectionItemOwnedByUser, listCollectionForPicker } from "@/modules/wear-logs/data";
import { findFragranceById } from "@/modules/fragrances";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LogWearForm } from "./log-wear-form";
import type { WearFieldDefaults } from "../wear-form-fields";

type SearchParams = Promise<{ collectionItemId?: string; fragranceId?: string }>;

export const metadata = { title: "Log a wear" };

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function nowLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankDefaults(): WearFieldDefaults {
  return {
    wornAt: nowLocalIso(),
    sprays: "4",
    occasion: "CASUAL",
    environment: "MIXED",
    temperatureC: "",
    humidityPct: "",
    weatherCondition: "",
    longevityHours: "",
    projection: "",
    enjoyment: "",
    notes: "",
  };
}

export default async function LogWearPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/wear/new");
  const params = await searchParams;

  // Mode A: prefilled from a collection item.
  if (params.collectionItemId) {
    const owned = await findCollectionItemOwnedByUser(user.id, params.collectionItemId);
    if (!owned) notFound();
    return (
      <FormShell eyebrow="From your collection">
        <LogWearForm
          fragranceId={owned.fragranceId}
          collectionItemId={owned.id}
          defaults={blankDefaults()}
        />
      </FormShell>
    );
  }

  // Mode B: prefilled from a catalogue fragrance (sample/borrow).
  if (params.fragranceId) {
    const f = await findFragranceById(params.fragranceId);
    if (!f) notFound();
    return (
      <FormShell eyebrow={`Sample · ${f.brand.name} · ${f.name}`}>
        <p className="mb-6 text-xs text-[color:var(--fg-muted)]">
          Logging as a sample — this bottle isn&apos;t in your wardrobe.
        </p>
        <LogWearForm fragranceId={f.id} defaults={blankDefaults()} />
      </FormShell>
    );
  }

  // Mode C: no prefill — show a picker.
  const collection = await listCollectionForPicker(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Today"
        title="Log a wear"
        subtitle="Pick what you're wearing."
        actions={
          collection.length > 0 ? (
            <Link
              href="/advisor"
              className="rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 text-xs hover:bg-[color:var(--bg-elev)]"
            >
              Ask the advisor
            </Link>
          ) : null
        }
      />

      {collection.length === 0 ? (
        <EmptyState title="Your wardrobe is empty.">
          Add a fragrance from the{" "}
          <Link href="/fragrances" className="link-editorial">
            catalogue
          </Link>{" "}
          first, or log a sample by browsing and picking &ldquo;Log a sample wear&rdquo;.
        </EmptyState>
      ) : (
        // These rows are the primary action of the page, so they have to look
        // pressable. Previously they were unstyled links — indistinguishable
        // from a static list, with nothing but a faint hover to suggest you
        // could click one.
        <ul className="flex flex-col gap-2">
          {collection.map((item) => (
            <li key={item.id}>
              <Link
                href={{
                  pathname: "/wear/new",
                  query: { collectionItemId: item.id },
                }}
                className="group flex items-center justify-between gap-4 rounded-sm border border-[color:var(--rule)] bg-[color:var(--bg-elev)] px-4 py-3.5 transition-colors hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-wash)]"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--fg-faint)] uppercase">
                    {item.fragrance.brand.name}
                  </p>
                  <p className="mt-1 font-serif text-lg leading-snug">{item.fragrance.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="numeric text-xs text-[color:var(--fg-muted)]">
                    {item.bottleSizeMl} ml
                  </span>
                  <span
                    aria-hidden
                    className="text-[color:var(--fg-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--accent)]"
                  >
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-[color:var(--fg-muted)]">
        Wearing something you don&apos;t own?{" "}
        <Link href="/fragrances" className="link-editorial">
          Browse the catalogue
        </Link>
        .
      </p>
    </div>
  );
}

function FormShell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/wear/new"
        className="text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
      >
        ← Pick something else
      </Link>
      <header className="mt-6 mb-8 border-b border-[color:var(--rule)] pb-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-2 font-serif text-3xl leading-tight">Log a wear</h1>
      </header>
      {children}
    </div>
  );
}
