import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { deleteCollectionItemAction, minorToDecimalString } from "@/modules/collection";
import { findCollectionItemForUser } from "@/modules/collection/data";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EditCollectionForm } from "./edit-collection-form";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit collection item" };

export default async function EditCollectionItemPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/collection/${id}/edit`);
  const item = await findCollectionItemForUser(user.id, id);
  if (!item) notFound();

  const defaults = {
    bottleSizeMl: item.bottleSizeMl,
    remainingMl: item.remainingMl?.toString() ?? "",
    priceDecimal:
      item.purchasePriceMinor !== null ? minorToDecimalString(item.purchasePriceMinor) : "",
    currency: item.currency ?? "",
    purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : "",
    purchaseSource: item.purchaseSource ?? "",
    batchCode: item.batchCode ?? "",
    condition: item.condition,
    personalRating: item.personalRating?.toString() ?? "",
    personalNotes: item.personalNotes ?? "",
  };

  const deleteBound = deleteCollectionItemAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/collection"
        className="inline-flex min-h-11 items-center text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
      >
        ← Collection
      </Link>

      <header className="mt-6 mb-10 border-b border-[color:var(--rule)] pb-6">
        <Eyebrow>{item.fragrance.brand.name}</Eyebrow>
        <h1 className="mt-2 font-serif text-3xl leading-tight">{item.fragrance.name}</h1>
      </header>

      <EditCollectionForm itemId={id} defaults={defaults} />

      <form action={deleteBound} className="mt-16 border-t border-[color:var(--rule)] pt-6">
        <p className="text-xs text-[color:var(--fg-muted)]">
          Removing this item deletes it from your collection permanently. Wears remain in your
          history (unlinked from a bottle).
        </p>
        <button
          type="submit"
          className="mt-3 min-h-11 rounded-sm border border-[color:var(--fg)] px-4 text-sm font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-sunken)]"
        >
          Remove from collection
        </button>
      </form>
    </div>
  );
}
