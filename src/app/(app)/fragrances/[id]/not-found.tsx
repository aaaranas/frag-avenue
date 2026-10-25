import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function FragranceNotFound() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Not in the catalogue">
        This fragrance doesn&rsquo;t exist or isn&rsquo;t available.{" "}
        <Link href="/fragrances" className="link-editorial">
          Search the catalogue
        </Link>
        .
      </EmptyState>
    </div>
  );
}
