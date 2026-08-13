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
        className="text-xs tracking-[0.14em] text-[color:var(--fg-faint)] uppercase hover:text-[color:var(--fg)]"
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
          className="mt-3 rounded-sm border border-red-700/40 px-4 py-2 text-sm text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          Remove from collection
        </button>
      </form>
    </div>
  );
}
