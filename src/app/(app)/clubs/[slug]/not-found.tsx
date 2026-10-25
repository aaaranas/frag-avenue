import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function ClubNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="No such club"
        icon={<SearchX />}
        action={
          <Button asChild variant="outline">
            <Link href="/clubs">See all clubs</Link>
          </Button>
        }
      >
        It doesn&rsquo;t exist, or its name changed.
      </EmptyState>
    </div>
  );
}
