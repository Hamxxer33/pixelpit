/**
 * Direct X (Twitter) sign-in for this app's own deployment — server-only.
 *
 * Sign-in normally federates through the shared Grok auth broker
 * (`auth.grok.me`), which only issues callbacks for origins it has a client
 * registered for: a `*.grok-sandbox.com` live preview, or an app the Grok
 * deployer provisioned. PIXELPIT ships to its own domain, so the broker holds
 * nothing for it and answers the authorize request with
 * `{"message":"Invalid redirect URI"}` — X is never even reached.
 *
 * With credentials set, the app talks to X itself instead, using Better Auth's
 * built-in `twitter` provider (OAuth 2.0 + PKCE, basic token auth, `/2/users/me`
 * for the profile). That provider's callback path is
 *
 *     /api/auth/callback/twitter
 *
 * which is the URL to register in the X developer portal. Without credentials
 * nothing here is registered and the broker stays the upstream — see
 * `server.ts`, and `./providers` for how the UI picks between the two.
 *
 * These are the **OAuth 2.0** credentials from the X portal's "User
 * authentication settings" — not `X_API_KEY` / `X_API_SECRET`, which are the
 * consumer keys the read-only post lookup mints an app bearer from
 * (`x-auth.server.ts`).
 *
 * NEVER import this from client code.
 */
import type { BetterAuthOptions } from "better-auth";
// Explicit `.ts` extension so this module also loads under `node --test`
// (the bundler resolves either way) — same convention as `gate-identity.server.ts`.
import { X_BROKER_PROVIDER_ID, X_SOCIAL_PROVIDER_ID } from "./providers.ts";

/**
 * Scopes kept to the minimum the board needs: identify the account
 * (`users.read`), read public posts (`tweet.read`), and keep the grant alive
 * across sessions (`offline.access`).
 *
 * Better Auth's default set also asks for `users.email`, which is opt-in per X
 * app — requesting a scope the app was not granted fails the whole authorize
 * request — so the defaults are switched off and these passed explicitly.
 */
const SCOPES = ["users.read", "tweet.read", "offline.access"];

/**
 * Better Auth requires an email on every account and, without `users.email`, X
 * gives us none. Mint a stable synthetic address from the numeric X user id
 * instead, under the RFC 2606 `.invalid` TLD so it can never route anywhere.
 * Keyed on the id rather than the handle, so renaming an X account keeps the
 * same identity.
 */
function syntheticEmail(userId: string): string {
  return `${userId}@users.x.invalid`;
}

/**
 * The OAuth 2.0 client for X, or `null` when none is configured.
 *
 * `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` are the names Better Auth uses
 * for this provider; `X_CLIENT_ID` / `X_CLIENT_SECRET` are accepted as aliases
 * because the rest of this app calls the product X.
 */
function credentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TWITTER_CLIENT_ID?.trim() || process.env.X_CLIENT_ID?.trim();
  const clientSecret =
    process.env.TWITTER_CLIENT_SECRET?.trim() || process.env.X_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/** True when X sign-in talks to X directly rather than through the broker. */
export function xDirectAuthConfigured(): boolean {
  return Boolean(credentials());
}

type SocialProviders = NonNullable<BetterAuthOptions["socialProviders"]>;

/**
 * The object form of Better Auth's `twitter` entry. The declared type is a union
 * with a lazy function form; narrowing to the object keeps the config readable
 * (and assertable in tests) without restating its fields.
 */
type TwitterConfig = Extract<SocialProviders["twitter"], { clientId: string }>;

/**
 * `socialProviders` for `betterAuth({...})` — the `twitter` entry when a direct
 * client is configured, otherwise empty so nothing is registered.
 */
export function xSocialProviders(): { twitter?: TwitterConfig } {
  const creds = credentials();
  if (!creds) return {};
  return {
    twitter: {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      disableDefaultScope: true,
      scope: SCOPES,
      // Runs after Better Auth has read `/2/users/me`, and its result is spread
      // over the mapped user — so this fills the email in rather than letting
      // the provider fall back to using the handle as one.
      mapProfileToUser: (profile) => {
        const id = profile.data?.id;
        return {
          ...(profile.data?.email ? {} : { email: syntheticEmail(String(id)) }),
          // X serves a 48px `_normal` crop by default — ask for the original.
          image: profile.data?.profile_image_url?.replace("_normal", ""),
        };
      },
    },
  };
}

/**
 * Which provider id the "Connect X" button should start sign-in with: the
 * direct one when a client is configured, the brokered one otherwise.
 *
 * The client cannot work this out for itself — the credentials are server-only
 * — and it must know BEFORE the click, because the live-preview popup has to
 * open synchronously on the user gesture. So this is resolved during SSR and
 * handed down through `AuthProvider` (see `src/routes/__root.tsx`).
 */
export function activeXProviderId(): string {
  return xDirectAuthConfigured() ? X_SOCIAL_PROVIDER_ID : X_BROKER_PROVIDER_ID;
}
