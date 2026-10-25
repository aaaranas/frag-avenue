import { googleEnabled } from "@/modules/auth/google";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthPanel mode="sign-up" google={googleEnabled()}>
      <SignUpForm />
    </AuthPanel>
  );
}
