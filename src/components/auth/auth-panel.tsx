import { SegmentedNav } from "@/components/ui/segmented-nav";
import { GoogleButton } from "./google-button";

/**
 * The card on the sign-in and sign-up screens: a switch between the two, an
 * OAuth error if Google sent one back, Google (when configured) and an "or"
 * rule, then the form. The heading is for assistive tech; the switch shows
 * sighted users where they are.
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
  return (
    <section
      aria-labelledby="auth-heading"
      className="rounded-2xl border border-[color:var(--rule)] bg-[color:var(--bg-elev)] p-5 shadow-sm sm:p-6"
    >
      <h2 id="auth-heading" className="sr-only">
        {mode === "sign-in" ? "Sign in" : "Create your account"}
      </h2>
      <SegmentedNav
        label="Account"
        className="mb-6"
        segments={[
          { href: "/sign-in", label: "Sign in", current: mode === "sign-in" },
          { href: "/sign-up", label: "Create account", current: mode === "sign-up" },
        ]}
      />
      {error ? (
        <p
          role="alert"
          className="form-error mb-5 rounded-lg border border-[color:var(--rule-strong)] bg-[color:var(--bg-sunken)] px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      ) : null}
      {google ? (
        <>
          <GoogleButton next={next} />
          <div className="my-5 flex items-center gap-3 text-xs text-[color:var(--fg-muted)]">
            <span className="h-px flex-1 bg-[color:var(--rule)]" />
            or with email
            <span className="h-px flex-1 bg-[color:var(--rule)]" />
          </div>
        </>
      ) : null}
      {children}
    </section>
  );
}
