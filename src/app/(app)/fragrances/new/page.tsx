import { requireUser } from "@/modules/auth/session";
import { SubmitFragranceForm } from "./submit-fragrance-form";
import { BackLink } from "@/components/ui/back-link";

export const metadata = { title: "Submit a fragrance" };

type SearchParams = Promise<{ name?: string | string[] }>;

export default async function SubmitFragrancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser("/fragrances/new");
  const raw = (await searchParams).name;
  const name = typeof raw === "string" ? raw.slice(0, 120) : "";

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/fragrances">Catalogue</BackLink>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Submit a missing fragrance</h1>
      <p className="mt-2 mb-8 text-sm text-[color:var(--fg-muted)]">
        It&rsquo;s added for review. Until then only you can see it, and you can add it to your
        wardrobe straight away.
      </p>
      <SubmitFragranceForm defaultName={name} />
    </div>
  );
}
