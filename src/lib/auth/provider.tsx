import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, privyEnabled } from "./privy";

/**
 * App-wide client provider mounted once near the root (in `src/routes/__root.tsx`).
 *
 * Privy owns login, so its provider wraps the tree — `usePrivy()` and the
 * wallet hooks only work underneath it. When `VITE_PRIVY_APP_ID` is unset this
 * is a passthrough, so the app still renders (signed out) rather than crashing
 * on a missing app id: the sign-in buttons report that login is unconfigured.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!privyEnabled) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // X is the only identity the board can rank, so it leads. `wallet` is
        // offered too because a hunter locks one for WL/GTD anyway — linking it
        // here saves them pasting an address (see `WalletBlock`).
        loginMethods: ["twitter", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#c7d4c0",
          logo: "/favicon.svg",
          walletChainType: "ethereum-and-solana",
        },
        // Don't auto-create an embedded wallet: the board locks ONE wallet per
        // hunter and it should be a wallet they already control, not one Privy
        // minted on sign-in.
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
