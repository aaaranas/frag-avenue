import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function WardrobeItemNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Not in your wardrobe">
        This item doesn&rsquo;t exist or was removed.{" "}
        <Link href="/wardrobe" className="link-editorial">
          Back to your wardrobe
        </Link>
        .
      </EmptyState>
    </div>
  );
}
