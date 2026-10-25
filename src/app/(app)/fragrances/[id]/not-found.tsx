import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function FragranceNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="Not in the catalogue"
        icon={<SearchX />}
        action={
          <Button asChild variant="outline">
            <Link href="/fragrances">Search the catalogue</Link>
          </Button>
        }
      >
        This fragrance doesn&rsquo;t exist or isn&rsquo;t available.
      </EmptyState>
    </div>
  );
}
