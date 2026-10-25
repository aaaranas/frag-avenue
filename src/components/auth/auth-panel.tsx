import { GoogleButton } from "./google-button";

/**
 * The body of the sign-in and sign-up screens: a heading, an OAuth error if
 * Google sent one back, Google (when configured) and an "or" rule, then the
 * form, with the switch to the other screen underneath.
 */
export function AuthPanel({
  title,
  error,
  google,
  next,
  footer,
  children,
}: {
  title: string;
  error?: string | null;
  google: boolean;
  next?: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="auth-heading">
      <div className="sm:rounded-xl sm:border sm:border-[color:var(--rule)] sm:bg-[color:var(--bg-elev)] sm:p-8">
        <h2 id="auth-heading" className="mb-6 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {error ? (
          <p
            role="alert"
            className="form-error mb-5 rounded-md border border-[color:var(--rule-strong)] px-3 py-2"
          >
            {error}
          </p>
        ) : null}
        {google ? (
          <>
            <GoogleButton next={next} />
            <div className="my-6 flex items-center gap-3 text-xs text-[color:var(--fg-muted)]">
              <span className="h-px flex-1 bg-[color:var(--rule)]" />
              or with email
              <span className="h-px flex-1 bg-[color:var(--rule)]" />
            </div>
          </>
        ) : null}
        {children}
      </div>
      <p className="mt-6 text-center text-sm text-[color:var(--fg-muted)]">{footer}</p>
    </section>
  );
}
