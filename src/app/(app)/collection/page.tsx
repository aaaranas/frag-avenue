import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listCollectionForUser } from "@/modules/collection/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { BottleLegend } from "@/components/bottle/bottle-legend";
import { Button } from "@/components/ui/button";
import { CollectionShelf } from "./collection-shelf";

export default async function CollectionPage() {
  const user = await requireUser("/collection");
  const items = await listCollectionForUser(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Wardrobe"
        title="Collection"
        subtitle={items.length > 0 ? "Click a bottle to see its notes and details." : undefined}
        actions={
          <Button asChild variant="outline">
            <Link href="/fragrances">Browse catalogue</Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="Your shelves are empty.">
          <Link href="/fragrances" className="link-editorial">
            Add your first fragrance
          </Link>{" "}
          from the catalogue.
        </EmptyState>
      ) : (
        <>
          <CollectionShelf items={items} />
          <BottleLegend showFill />
        </>
      )}
    </div>
  );
}
