import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "./google-button";

const COPY = {
  "sign-in": {
    title: "Sign in",
    switchPrompt: "New to Frag Avenue?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    title: "Create your account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

/**
 * The sign-in and sign-up card: the page title, an OAuth error if Google sent
 * one back, Google (when configured) and an "or" rule, the form, then a link
 * to the other screen. Flat on a phone, a card on wider screens.
 */
export function AuthPanel({
  mode,
  error,
  google,
  next,
  children,
}: {
  mode: "sign-in" | "sign-up";
  error?: string | null;
  google: boolean;
  next?: string;
  children: React.ReactNode;
}) {
  const copy = COPY[mode];
  return (
    <Card className="sm:bg-card gap-7 border-0 bg-transparent py-0 shadow-none sm:border sm:py-8 sm:shadow-sm">
      <CardHeader className="px-0 sm:px-8">
        <CardTitle>
          <h1 className="text-[1.625rem] leading-tight font-semibold tracking-tight font-stretch-semi-condensed">
            {copy.title}
          </h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-0 sm:px-8">
        {error ? (
          <p
            role="alert"
            className="form-error rounded-md border border-[color:var(--rule-strong)] bg-[color:var(--bg-sunken)] px-3 py-2.5 text-sm"
          >
            {error}
          </p>
        ) : null}
        {google ? (
          <>
            <GoogleButton next={next} />
            <div className="flex items-center gap-3 text-xs text-[color:var(--fg-muted)]">
              <Separator className="flex-1" />
              or
              <Separator className="flex-1" />
            </div>
          </>
        ) : null}
        {children}
      </CardContent>
      <CardFooter className="justify-center px-0 text-sm text-[color:var(--fg-muted)] sm:px-8">
        {copy.switchPrompt}
        <Link
          href={copy.switchHref}
          className="ml-1 inline-flex min-h-11 items-center font-medium text-[color:var(--accent-color)] underline-offset-4 hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}
