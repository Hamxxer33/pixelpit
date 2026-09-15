/**
 * Privy configuration for the browser (no secrets here).
 *
 * Privy owns user login for PIXELPIT: it brokers X sign-in using its OWN
 * registered X app, which is the whole point — no X developer-portal callback
 * to keep in sync with our domain, and no `Invalid redirect URI` when the
 * deployment moves. It also handles wallet connect, which the board already
 * needs (`hunters.wallet_address`).
 *
 * The app id is public by design: it identifies the app to Privy's API and is
 * embedded in the browser bundle. It doubles as the `aud` claim the server
 * checks when verifying an access token (see `./privy.server`), so both sides
 * read the same value and share one validity rule.
 */
import { isValidPrivyAppId } from "./privy-shared";

export * from "./privy-shared";

/** Privy app id, from the Privy dashboard. Empty when unset. */
export const PRIVY_APP_ID = (import.meta.env.VITE_PRIVY_APP_ID ?? "").trim();

/** True when Privy is configured and login should be offered. */
export const privyEnabled = isValidPrivyAppId(PRIVY_APP_ID);

if (PRIVY_APP_ID && !privyEnabled) {
  console.warn(
    `[auth] VITE_PRIVY_APP_ID is ${PRIVY_APP_ID.length} characters; Privy app ` +
      "ids are 25. Login is disabled until it is corrected.",
  );
}
