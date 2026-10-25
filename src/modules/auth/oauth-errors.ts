/**
 * What to tell someone when an OAuth round trip fails. Auth.js sends them back
 * with `?error=<code>`; codes are Auth.js's, and anything unknown gets the
 * generic line. `connect` is linking Google from the profile while signed in.
 */
export type OAuthContext = "sign-in" | "connect";

export function oauthErrorMessage(code: string | undefined, context: OAuthContext): string | null {
  if (!code) return null;
  switch (code) {
    case "OAuthAccountNotLinked":
      return context === "connect"
        ? "That Google account is already linked to another Frag Avenue account."
        : "This email already has a Frag Avenue password. Sign in with it, then connect Google from your profile.";
    case "AccessDenied":
      return "Google sign-in was cancelled, or the Google account's email isn't verified.";
    case "Configuration":
      return "Google sign-in isn't available right now. Use your email and password.";
    default:
      return "Couldn't sign in with Google. Try again.";
  }
}
