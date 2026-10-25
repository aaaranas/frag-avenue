import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Clubs" };

export default function ClubsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Clubs" title="Clubs & challenges" />
      <EmptyState title="Clubs are on the way">
        Join clubs and take on challenges like 30 different scents in 30 days. Wears you log now
        will count towards them.
      </EmptyState>
    </div>
  );
}
