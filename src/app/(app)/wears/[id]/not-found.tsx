import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function WearNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="Wear not found"
        icon={<SearchX />}
        action={
          <Button asChild variant="outline">
            <Link href="/wears">See your wears</Link>
          </Button>
        }
      >
        It doesn&rsquo;t exist or was deleted.
      </EmptyState>
    </div>
  );
}
