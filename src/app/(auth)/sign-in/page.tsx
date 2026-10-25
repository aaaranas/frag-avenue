import Link from "next/link";
import { SignInForm } from "./sign-in-form";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : undefined;

  return (
    <section aria-labelledby="auth-heading">
      <h2 id="auth-heading" className="sr-only">
        Sign in
      </h2>
      <SignInForm next={safeNext} />
      <p className="mt-6 text-center text-sm text-[color:var(--fg-muted)]">
        New here?{" "}
        <Link
          href="/sign-up"
          className="link-editorial inline-flex min-h-11 items-center text-[color:var(--fg)]"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
