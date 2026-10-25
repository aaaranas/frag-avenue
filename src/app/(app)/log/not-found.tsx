import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function LogItemNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Can't log that">
        That item isn&rsquo;t in your wardrobe, or it&rsquo;s on your wishlist.{" "}
        <Link href="/log" className="link-editorial">
          Pick something you own
        </Link>
        .
      </EmptyState>
    </div>
  );
}
