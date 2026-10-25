import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function LogItemNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        title="Can't log that"
        icon={<CircleSlash />}
        action={
          <Button asChild variant="outline">
            <Link href="/log">Pick something you own</Link>
          </Button>
        }
      >
        That item isn&rsquo;t in your wardrobe, or it&rsquo;s on your wishlist.
      </EmptyState>
    </div>
  );
}
