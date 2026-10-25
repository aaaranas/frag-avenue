import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function ProfileNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="No one by that name"
        icon={<UserX />}
        action={
          <Button asChild variant="outline">
            <Link href="/people">Search for people</Link>
          </Button>
        }
      >
        Check the spelling, or search for them.
      </EmptyState>
    </div>
  );
}
