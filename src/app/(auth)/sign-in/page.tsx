import Link from "next/link";
import { SignInForm } from "./sign-in-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : undefined;

  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight">Welcome back.</h1>
      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">Sign in to your wardrobe.</p>
      <div className="mt-10">
        <SignInForm next={safeNext} />
      </div>
      <p className="mt-8 text-sm text-[color:var(--fg-muted)]">
        New here?{" "}
        <Link href="/sign-up" className="link-editorial text-[color:var(--fg)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
