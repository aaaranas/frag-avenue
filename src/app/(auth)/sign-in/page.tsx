import Link from "next/link";
import { oauthErrorMessage } from "@/modules/auth";
import { googleEnabled } from "@/modules/auth/google";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignInForm } from "./sign-in-form";

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: Props) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <AuthPanel
      title="Sign in"
      error={oauthErrorMessage(error, "sign-in")}
      google={googleEnabled()}
      next={safeNext}
      footer={
        <>
          New here?{" "}
          <Link
            href="/sign-up"
            className="link-editorial inline-flex min-h-11 items-center text-[color:var(--fg)]"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={safeNext} />
    </AuthPanel>
  );
}
