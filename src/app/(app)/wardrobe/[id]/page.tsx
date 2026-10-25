import { ConfirmAction } from "@/components/forms/confirm-action";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { requireUser } from "@/modules/auth/session";
import { findWardrobeItemForUser } from "@/modules/wardrobe/data";
import {
  deleteWardrobeItemAction,
  minorToDecimalString,
  updateWardrobeItemAction,
  wearCountLabel,
} from "@/modules/wardrobe";
import { findUserPreferences } from "@/modules/users/data";
import { WardrobeItemForm } from "@/components/wardrobe/wardrobe-item-form";
import { FragranceThumb } from "@/components/wardrobe/fragrance-thumb";
import { BackLink } from "@/components/ui/back-link";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Edit wardrobe item" };

export default async function EditWardrobeItemPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser(`/wardrobe/${id}`);
  const [item, prefs] = await Promise.all([
    findWardrobeItemForUser(user.id, id),
    findUserPreferences(user.id),
  ]);
  // Someone else's item and a missing one look the same: not found.
  if (!item) notFound();

  const update = updateWardrobeItemAction.bind(null, item.id);
  const remove = deleteWardrobeItemAction.bind(null, item.id);
  const wears = item._count.wears;

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/wardrobe">Wardrobe</BackLink>

      <header className="mt-4 mb-8 flex items-center gap-4">
        <FragranceThumb imagePath={item.fragrance.imagePath} kind={item.kind} />
        <div className="min-w-0">
          <p className="label-caps">{item.fragrance.brand.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{item.fragrance.name}</h1>
          <p className="text-sm text-[color:var(--fg-muted)]">{wearCountLabel(wears)} logged</p>
        </div>
      </header>

      <WardrobeItemForm
        action={update}
        fragranceId={item.fragrance.id}
        submitLabel="Save changes"
        defaults={{
          kind: item.kind,
          bottleSizeMl: item.bottleSizeMl?.toString() ?? "",
          remainingMl: item.remainingMl?.toString() ?? "",
          priceDecimal:
            item.purchasePriceMinor !== null ? minorToDecimalString(item.purchasePriceMinor) : "",
          currency: item.currency ?? prefs?.defaultCurrency ?? "",
          purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : "",
          personalNotes: item.personalNotes ?? "",
        }}
      />

      <section className="mt-12 border-t border-[color:var(--rule)] pt-6">
        <p className="text-sm text-[color:var(--fg-muted)]">
          Remove this item from your wardrobe.
          {wears > 0 ? ` Its ${wearCountLabel(wears)} stay in your log.` : null}
        </p>
        <ConfirmAction
          action={remove}
          title={`Remove ${item.fragrance.name}?`}
          description={
            wears > 0
              ? `It leaves your wardrobe; its ${wearCountLabel(wears)} stay in your log.`
              : "It leaves your wardrobe. You can add it again later."
          }
          confirmLabel="Remove"
          trigger={
            <Button variant="outline" className="mt-3">
              Remove from wardrobe
            </Button>
          }
        />
      </section>
    </div>
  );
}
