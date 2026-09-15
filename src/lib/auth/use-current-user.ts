import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import type { User as PrivyUser } from "@privy-io/react-auth";
import { privyEnabled } from "./privy";

/** Normalized user shape used across the app. */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** The linked X handle, without the `@`. Null when no X account is linked. */
  xHandle: string | null;
  /** The linked wallet address, if the visitor connected one through Privy. */
  walletAddress: string | null;
  /** True when this is a sandbox/dev fallback rather than a real identity. */
  isDevFallback: boolean;
};

/** `useCurrentUserState()` result: the user plus the session-loading flag. */
export type CurrentUserState = {
  /** The user — `null` BOTH while the session loads and when signed out. */
  user: AppUser | null;
  /** True while the session is still resolving — don't treat `user: null` as signed out yet. */
  isPending: boolean;
};

/**
 * Whether this browser had a session last time it was here.
 *
 * Privy restores its session client-side, so on a cold load there is a moment
 * where we genuinely don't know yet. Showing a loading skeleton to everyone
 * would flash it at first-time visitors who should just see the landing page;
 * showing the landing page to everyone would flash it at signed-in hunters. The
 * server used to settle this during SSR, which Privy can't do.
 *
 * So we remember the last known answer under our OWN key — deliberately not
 * Privy's internal storage, which is an implementation detail we shouldn't
 * couple to. It is a RENDERING HINT ONLY and never grants access: every server
 * function still verifies a real Privy token.
 */
const SESSION_HINT_KEY = "pixelpit.had-session";

/** True when this browser was signed in last time. Safe when storage is blocked. */
export function hadPreviousSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberSession(signedIn: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (signedIn) window.localStorage.setItem(SESSION_HINT_KEY, "1");
    else window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* storage unavailable — the hint is optional */
  }
}

/** Shorten an address for display: `0x1234…cdef`. */
function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Map Privy's user onto the shape the rest of the app already speaks. */
function toAppUser(user: PrivyUser): AppUser {
  const x = user.twitter;
  const wallet = user.wallet;
  return {
    id: user.id,
    displayName:
      x?.name?.trim() || x?.username?.trim() || (wallet ? shortAddress(wallet.address) : null),
    primaryEmail: user.email?.address ?? null,
    // X serves a 48px `_normal` crop by default — ask for the original.
    profileImageUrl: x?.profilePictureUrl?.replace("_normal", "") ?? null,
    xHandle: x?.username?.trim() || null,
    walletAddress: wallet?.address ?? null,
    isDevFallback: false,
  };
}

/**
 * Current user + loading state, from Privy.
 *
 *   - Privy configured -> the real signed-in user; `user` is `null` while the
 *     session resolves (`isPending: true`) and when signed out
 *     (`isPending: false`).
 *   - `VITE_PRIVY_APP_ID` unset -> nobody is signed in and nothing is pending;
 *     the sign-in buttons report that login isn't configured.
 *
 * Protect a route by waiting out `isPending` before acting on `user` —
 * redirecting on `user: null` alone bounces signed-in visitors to sign-in on
 * every hard reload:
 *
 *   import { RedirectToSignIn } from "@/lib/auth/gates";
 *   const { user, isPending } = useCurrentUserState();
 *   if (isPending) return null;              // still resolving — don't redirect yet
 *   if (!user) return <RedirectToSignIn />;  // definitely signed out
 *
 * `privyEnabled` is a module-level constant fixed at load, so the guarded hook
 * calls keep a stable hook order across every render of a given component.
 */
export function useCurrentUserState(): CurrentUserState {
  if (!privyEnabled) return { user: null, isPending: false };
  /* eslint-disable react-hooks/rules-of-hooks -- privyEnabled is constant for the app's lifetime */
  const { ready, authenticated, user } = usePrivy();
  const signedIn = ready && authenticated && Boolean(user);
  useEffect(() => {
    if (ready) rememberSession(signedIn);
  }, [ready, signedIn]);
  /* eslint-enable react-hooks/rules-of-hooks */
  return {
    user: signedIn && user ? toAppUser(user) : null,
    isPending: !ready,
  };
}

/**
 * Convenience view of `useCurrentUserState().user` for display (e.g.
 * `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
 * for redirects/guards use `useCurrentUserState()` and check `isPending`.
 */
export function useCurrentUser(): AppUser | null {
  return useCurrentUserState().user;
}
