/**
 * Privy constants and pure helpers, shared by client and server.
 *
 * Deliberately free of `import.meta.env`: the server modules and the unit tests
 * import this, and `import.meta.env` only exists inside a Vite bundle. The
 * client-side app id lives in `./privy`, which layers it on top.
 */

/** Issuer on every Privy-issued access token. */
export const PRIVY_ISSUER = "privy.io";

/** Privy signs access tokens with ES256. */
export const PRIVY_JWT_ALG = "ES256";

/** Privy app ids are exactly this long. */
export const PRIVY_APP_ID_LENGTH = 25;

/**
 * Privy app ids are exactly 25 characters, and `PrivyProvider` THROWS on
 * anything else — during SSR, which turns a mistyped env var into a 500 on
 * every page rather than just a broken login button. So the id is validated
 * before the provider ever sees it (`./provider`), and a bad one degrades to
 * "login not configured".
 */
export function isValidPrivyAppId(id: string): boolean {
  return id.length === PRIVY_APP_ID_LENGTH;
}

/** The public JWKS for an app, used to verify its access tokens. */
export function privyJwksUrl(appId: string): string {
  return `https://auth.privy.io/api/v1/apps/${appId}/jwks.json`;
}

/**
 * Privy user ids are DIDs (`did:privy:abc123`). They land in `hunters.user_id`,
 * which is a free-form text column, so no migration is needed — but they are a
 * different shape from the Better Auth ids that came before, so a row written
 * under the old scheme belongs to nobody now. Sign-in never worked in
 * production, so there is nothing real to migrate.
 */
export type PrivyUserId = string;
