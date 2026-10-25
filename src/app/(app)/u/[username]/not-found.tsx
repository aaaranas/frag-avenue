import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProfileNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="No one by that name">
        <Link href="/people" className="link-editorial">
          Search for people
        </Link>
        .
      </EmptyState>
    </div>
  );
}
