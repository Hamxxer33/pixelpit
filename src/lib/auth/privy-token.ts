/**
 * The current Privy access token, readable OUTSIDE React.
 *
 * `authMiddleware`'s client hook runs for every server function call, not
 * inside a component, so it cannot use `usePrivy().getAccessToken()`. Privy
 * also exports that getter standalone, which is what this wraps — it reads the
 * session Privy already holds in the browser and refreshes the token when it is
 * near expiry.
 *
 * Kept in its own module so the middleware can `import()` it lazily: the Privy
 * SDK is large, and the middleware is dual client/server code that must not
 * drag it into the server bundle.
 */
import { privyEnabled } from "./privy";

/**
 * The access token to send as `Authorization: Bearer`, or `null` when Privy is
 * unconfigured, the visitor is signed out, or the SDK is unavailable (SSR, or a
 * refresh that could not complete). Never throws — a missing token means
 * "signed out", which the server turns into a 401.
 */
export async function getPrivyAccessToken(): Promise<string | null> {
  if (!privyEnabled || typeof window === "undefined") return null;
  try {
    const { getAccessToken } = await import("@privy-io/react-auth");
    return (await getAccessToken()) ?? null;
  } catch {
    return null;
  }
}
