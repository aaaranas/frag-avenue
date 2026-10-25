import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/modules/auth/session";
import { Eyebrow } from "@/components/ui/eyebrow";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (user) redirect("/feed");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-16 inline-block self-start hover:opacity-80">
        <Eyebrow>Frag Avenue</Eyebrow>
        <p className="mt-1 font-serif text-2xl leading-none italic">Wardrobe</p>
      </Link>
      {children}
    </div>
  );
}
