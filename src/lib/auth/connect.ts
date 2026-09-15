/**
 * Sign-in, sign-out and wallet linking — the hooks the UI calls.
 *
 * All three are Privy modal flows. They are wrapped here rather than called
 * directly for two reasons:
 *
 *  - Every failure reports itself. A bare `login()` that throws leaves the
 *    button looking dead, which is exactly how the previous X-OAuth breakage
 *    presented.
 *  - They stay safe when Privy is NOT configured. `AuthProvider` only mounts
 *    `PrivyProvider` for a valid app id, and Privy's hooks throw without their
 *    provider — so an unset or mistyped `VITE_PRIVY_APP_ID` would crash the
 *    render rather than just disabling login. Each hook below therefore checks
 *    `privyEnabled` BEFORE touching a Privy hook.
 *
 * `privyEnabled` is a module-level constant fixed at load, so these guarded
 * hook calls keep a stable hook order across every render of a component.
 */
/* eslint-disable react-hooks/rules-of-hooks -- privyEnabled is constant for the app's lifetime */
import { useCallback } from "react";
import { useConnectWallet, useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { privyEnabled } from "./privy";

/** Report a failure: a short line for the visitor, the raw one for the console. */
function report(err: unknown, fallback: string): void {
  console.error("[auth]", fallback, err);
  const message = err instanceof Error ? err.message : "";
  // Privy reports a dismissed modal as an error; that is a choice, not a fault.
  if (/closed|cancel|dismiss|abort|exited/i.test(message)) return;
  toast.error(message || fallback);
}

function notConfigured(): void {
  toast.error("Sign-in isn't configured yet.");
}

/**
 * Open Privy's login modal.
 *
 * Privy brokers X sign-in with its OWN registered X app, so there is no
 * developer-portal callback tied to our domain to keep in sync — which is the
 * reason login lives here rather than in a direct X OAuth flow.
 */
export function useConnectX(): () => void {
  if (!privyEnabled) return notConfigured;
  const { login } = useLogin({
    onError: (error) => report(error, "Couldn't connect. Try again."),
  });
  return useCallback(() => login(), [login]);
}

/** Sign out, then send the visitor somewhere. */
export function useSignOut(redirectTo = "/"): () => Promise<void> {
  if (!privyEnabled) return async () => {};
  const { logout } = useLogout();
  return useCallback(async () => {
    await logout();
    if (typeof window !== "undefined") window.location.href = redirectTo;
  }, [logout, redirectTo]);
}

/**
 * Link a wallet through Privy and hand the address back.
 *
 * The board locks ONE wallet per hunter, so the address still goes through
 * `submitWallet` server-side (which derives the chain and enforces uniqueness)
 * — this only saves the visitor pasting it by hand.
 */
export function useConnectWalletAddress(onAddress: (address: string) => void): () => void {
  if (!privyEnabled) return notConfigured;
  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => onAddress(wallet.address),
    onError: (error) => report(error, "Couldn't connect that wallet."),
  });
  return useCallback(() => connectWallet(), [connectWallet]);
}

/** True once Privy has resolved whether anyone is signed in. */
export function useAuthReady(): boolean {
  if (!privyEnabled) return true;
  return usePrivy().ready;
}
