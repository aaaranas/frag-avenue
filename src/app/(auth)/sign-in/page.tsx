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
      mode="sign-in"
      error={oauthErrorMessage(error, "sign-in")}
      google={googleEnabled()}
      next={safeNext}
    >
      <SignInForm next={safeNext} />
    </AuthPanel>
  );
}
