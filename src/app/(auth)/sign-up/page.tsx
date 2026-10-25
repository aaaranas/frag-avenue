import Link from "next/link";
import { googleEnabled } from "@/modules/auth/google";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthPanel
      title="Create your account"
      google={googleEnabled()}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="link-editorial inline-flex min-h-11 items-center text-[color:var(--fg)]"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthPanel>
  );
}
