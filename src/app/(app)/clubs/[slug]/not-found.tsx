import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function ClubNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="No such club">
        <Link href="/clubs" className="link-editorial">
          See all clubs
        </Link>
        .
      </EmptyState>
    </div>
  );
}
