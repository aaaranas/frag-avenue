import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <section aria-labelledby="auth-heading">
      <h2 id="auth-heading" className="sr-only">
        Create an account
      </h2>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-[color:var(--fg-muted)]">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="link-editorial inline-flex min-h-11 items-center text-[color:var(--fg)]"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
