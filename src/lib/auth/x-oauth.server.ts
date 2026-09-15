/**
 * Direct X (Twitter) OAuth 2.0 for this app's own deployment — server-only.
 *
 * Sign-in normally federates through the shared Grok auth broker
 * (`auth.grok.me`), which holds X's secrets and only accepts callbacks for
 * origins it has a client registered for: a `*.grok-sandbox.com` live preview,
 * or an app the Grok deployer provisioned. PIXELPIT ships to its own Vercel
 * project and its own domain, so the broker has nothing for it and "Connect X"
 * can never complete there.
 *
 * With `X_CLIENT_ID` + `X_CLIENT_SECRET` set, the app talks to X itself instead:
 * the same OAuth 2.0 + PKCE flow Better Auth's built-in `twitter` provider uses,
 * expressed as a `genericOAuth` provider so it keeps the provider id
 * (`grok-x`), the callback path and the live-preview popup path the rest of the
 * app already goes through. Without them, nothing here is registered and the
 * broker stays the upstream (see `server.ts`).
 *
 * These are the **OAuth 2.0** credentials from the X developer portal's "User
 * authentication settings" — not `X_API_KEY` / `X_API_SECRET`, which are the
 * consumer keys the read-only post lookup mints an app bearer from
 * (`x-auth.server.ts`).
 *
 * NEVER import this from client code.
 */
import type { GenericOAuthConfig } from "better-auth/plugins";

/** X's OAuth 2.0 endpoints, matching Better Auth's own `twitter` provider. */
const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const USERINFO_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url";

/**
 * Scopes kept to the minimum the board needs: identify the account
 * (`users.read`), read public posts (`tweet.read`), and keep the grant alive
 * across sessions (`offline.access`). `users.email` is deliberately left out —
 * it is opt-in per X app and requesting a scope the app was not granted fails
 * the whole authorize request.
 */
const SCOPES = ["users.read", "tweet.read", "offline.access"];

/**
 * Better Auth requires an email on every account, and X does not give us one
 * without `users.email`. Mint a stable synthetic address from the numeric X
 * user id instead, under the RFC 2606 `.invalid` TLD so it can never route
 * anywhere. Keyed on the id, not the handle, so a visitor who renames their
 * account keeps the same identity.
 */
function syntheticEmail(userId: string): string {
  return `${userId}@users.x.invalid`;
}

/** The shape of `GET /2/users/me`. */
type XUserResponse = {
  data?: {
    id?: string;
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
};

/** True when a direct-X client is configured for this deployment. */
export function xDirectAuthConfigured(): boolean {
  return Boolean(credentials());
}

function credentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.X_CLIENT_ID?.trim();
  const clientSecret = process.env.X_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * The `genericOAuth` entry that points `providerId` straight at X, or `null`
 * when no direct-X client is configured.
 *
 * `pkce` and `authentication: "basic"` are both required by X for a
 * confidential client: the code challenge is mandatory, and the client
 * credentials go in the `Authorization` header rather than the token body.
 */
export function xDirectProvider(providerId: string): GenericOAuthConfig | null {
  const creds = credentials();
  if (!creds) return null;
  return {
    providerId,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    authorizationUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    userInfoUrl: USERINFO_URL,
    scopes: SCOPES,
    pkce: true,
    authentication: "basic",
    // X's `/2/users/me` wraps the profile in a `data` envelope and names the
    // avatar `profile_image_url`, so the default OIDC-shaped reader finds
    // neither an id nor a name. Map it ourselves.
    getUserInfo: async (tokens) => {
      const res = await fetch(USERINFO_URL, {
        headers: {
          authorization: `Bearer ${tokens.accessToken}`,
          accept: "application/json",
          "user-agent": "PIXELPIT/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const payload = (await res.json().catch(() => null)) as XUserResponse | null;
      const profile = payload?.data;
      const id = profile?.id?.trim();
      if (!id) return null;
      return {
        id,
        // `name` is required by Better Auth; the handle is a fine stand-in for
        // an account whose display name is empty.
        name: profile?.name?.trim() || profile?.username?.trim() || id,
        email: syntheticEmail(id),
        // X serves a 48px `_normal` crop by default — ask for the original.
        image: profile?.profile_image_url?.replace("_normal", "") || undefined,
        // Synthetic, so never claim it is verified.
        emailVerified: false,
      };
    },
  };
}
