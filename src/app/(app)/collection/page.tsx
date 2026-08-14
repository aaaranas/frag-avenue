import Link from "next/link";
import { requireUser } from "@/modules/auth/session";
import { listCollectionForUser } from "@/modules/collection/data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionShelf } from "./collection-shelf";

export default async function CollectionPage() {
  const user = await requireUser("/collection");
  const items = await listCollectionForUser(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Wardrobe"
        title="Collection"
        subtitle={
          items.length > 0 ? "Tap a bottle to inspect its notes and log a wear." : undefined
        }
        actions={
          <Link
            href="/fragrances"
            className="rounded-sm border border-[color:var(--rule-strong)] px-3 py-1.5 text-xs tracking-wide hover:bg-[color:var(--bg-elev)]"
          >
            Browse catalogue
          </Link>
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
        <CollectionShelf items={items} />
      )}
    </div>
  );
}
