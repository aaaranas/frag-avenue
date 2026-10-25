import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function WardrobeItemNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="Not in your wardrobe"
        icon={<SearchX />}
        action={
          <Button asChild variant="outline">
            <Link href="/wardrobe">Back to your wardrobe</Link>
          </Button>
        }
      >
        This item doesn&rsquo;t exist or was removed.
      </EmptyState>
    </div>
  );
}
