/**
 * The upstream identity providers this app offers for sign-in (via the broker).
 *
 * Source of truth for BOTH the server (`server.ts`, one `genericOAuth` provider
 * per entry) and the client (`client.ts` / sign-in buttons). Kept in its own
 * dependency-free module so the client can import it without pulling the
 * server-only Better Auth instance (and `pg`) into the browser bundle.
 *
 * Each app federates to the shared **auth broker** (`GROK_AUTH_ISSUER`), which
 * holds the real Google/X secrets. The app never sees them — it only knows its
 * own per-app client id/secret and which upstream to ask the broker for (`idp`).
 *
 * To add an upstream (e.g. GitHub) once the broker supports it: add one entry
 * here (`{ providerId: "grok-github", idp: "github", label: "GitHub" }`). The
 * `providerId` is this app's local id and the OAuth callback path segment
 * (`/api/auth/oauth2/callback/<providerId>`); `idp` is the hint the broker reads
 * to pick the upstream (Better Auth's id for X is still `twitter`).
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
  { providerId: "grok-x", idp: "twitter", label: "X" },
];

/**
 * The provider id for X when the app signs in with X DIRECTLY rather than
 * through the broker (see `./x-oauth.server`). It is Better Auth's built-in
 * social provider id, which also fixes the callback path:
 *
 *     /api/auth/callback/twitter
 *
 * Distinct from the brokered entry above (`grok-x`, callback
 * `/api/auth/oauth2/callback/grok-x`), because the two are different upstreams
 * reached through different plugins. The server registers whichever it has
 * credentials for and tells the client which one is live — see
 * `activeXProviderId` in `./x-oauth.server`, and `AuthProvider`.
 */
export const X_SOCIAL_PROVIDER_ID = "twitter";

/** The provider id for X when it federates through the Grok broker. */
export const X_BROKER_PROVIDER_ID = "grok-x";

/** True for the provider id that goes straight to X (needs `signIn.social`). */
export function isSocialProviderId(providerId: string): boolean {
  return providerId === X_SOCIAL_PROVIDER_ID;
}
