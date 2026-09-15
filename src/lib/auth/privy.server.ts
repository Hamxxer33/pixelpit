/**
 * Verify Privy access tokens (server-only).
 *
 * The browser gets an access token from Privy and forwards it on every server
 * function call (see `./middleware`). We verify it here rather than calling
 * Privy's API: the token is a JWT signed with ES256, and the app's public keys
 * are served at a well-known JWKS URL, so verification is local and adds no
 * network hop to a request that already has the answer in hand.
 *
 * Uses `jose` — already a dependency for the gate-identity path
 * (`gate-identity.server.ts`), whose JWKS handling this mirrors — so no server
 * SDK is pulled in for this.
 *
 * NEVER import this from client code.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import {
  PRIVY_ISSUER,
  PRIVY_JWT_ALG,
  isValidPrivyAppId,
  privyJwksUrl,
  type PrivyUserId,
} from "./privy-shared.ts";

/**
 * The app id as the SERVER sees it.
 *
 * `VITE_`-prefixed vars are inlined into the browser bundle at build time and
 * are also present in the server process, so the same value normally serves
 * both. `PRIVY_APP_ID` is accepted as well, for a deployment that would rather
 * not rely on a `VITE_` var reaching the server.
 */
function appId(): string {
  const id = process.env.VITE_PRIVY_APP_ID?.trim() || process.env.PRIVY_APP_ID?.trim() || "";
  // Same validity rule as the client, so the two sides can never disagree about
  // whether Privy is configured.
  return isValidPrivyAppId(id) ? id : "";
}

/** True when the server can verify Privy tokens. */
export function privyConfigured(): boolean {
  return appId().length > 0;
}

/**
 * Remote key set, cached across requests.
 *
 * `createRemoteJWKSet` does its own caching and cooldown, so it must be built
 * once rather than per call — a fresh one per request would fetch the JWKS
 * every time. Keyed by app id so a changed id is picked up rather than served
 * from a stale key set.
 */
let cached: { id: string; jwks: JWTVerifyGetKey } | null = null;

function keySet(id: string): JWTVerifyGetKey {
  if (cached?.id !== id) {
    cached = { id, jwks: createRemoteJWKSet(new URL(privyJwksUrl(id))) };
  }
  return cached.jwks;
}

/**
 * The Privy user id (DID) carried by `token`, or `null` when it is missing,
 * expired, not ours, or not genuinely Privy-signed.
 *
 * Returns null rather than throwing: a bad token is "not signed in", which is
 * the caller's decision to act on (`requireUserId` turns it into a 401).
 */
export async function verifyPrivyToken(token: string | undefined): Promise<PrivyUserId | null> {
  const id = appId();
  if (!id || !token) return null;
  try {
    const { payload } = await jwtVerify(token, keySet(id), {
      algorithms: [PRIVY_JWT_ALG],
      issuer: PRIVY_ISSUER,
      // Pinning the audience is what stops a token minted for SOMEONE ELSE'S
      // Privy app being replayed against this one.
      audience: id,
      requiredClaims: ["sub", "iat", "exp"],
    });
    const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    return sub || null;
  } catch {
    return null;
  }
}
