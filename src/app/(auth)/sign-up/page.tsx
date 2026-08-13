import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-serif text-4xl leading-tight">Start your wardrobe.</h1>
      <p className="mt-3 text-sm text-[color:var(--fg-muted)]">Free. Your data is yours.</p>
      <div className="mt-10">
        <SignUpForm />
      </div>
      <p className="mt-8 text-sm text-[color:var(--fg-muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="link-editorial text-[color:var(--fg)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
