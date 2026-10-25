// Client-safe public surface of the auth module.
// Server-only session helpers (`currentUser`, `requireUser`) live in
// `@/modules/auth/session` — importing them from the barrel would drag
// the `server-only` marker into client bundles.
export {
  signInAction,
  signUpAction,
  signOutAction,
  signInWithGoogleAction,
  connectGoogleAction,
} from "./actions";
export { oauthErrorMessage, type OAuthContext } from "./oauth-errors";
export type { FormState } from "./actions";
export type { SessionUser } from "./session";
