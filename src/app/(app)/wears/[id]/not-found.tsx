import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function WearNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Wear not found">
        It doesn&rsquo;t exist or was deleted.{" "}
        <Link href="/wears" className="link-editorial">
          See your wears
        </Link>
        .
      </EmptyState>
    </div>
  );
}
