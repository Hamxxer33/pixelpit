import type { ReactNode } from "react";
import { X_BROKER_PROVIDER_ID } from "./providers";
import { XProviderContext } from "./x-provider-context";

/**
 * App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
 *
 *   <AuthProvider xProviderId={xProviderId}><Outlet /></AuthProvider>
 *
 * Better Auth's React client (`@/lib/auth/client`) needs no context provider of
 * its own — `useSession()` works standalone — so this carries only what the
 * server has to tell the client (which upstream backs the X button; see
 * `./x-provider-context`), and stays the single stable mount point for any
 * future client-side providers.
 */
export function AuthProvider({
  children,
  xProviderId = X_BROKER_PROVIDER_ID,
}: {
  children: ReactNode;
  xProviderId?: string;
}) {
  return <XProviderContext.Provider value={xProviderId}>{children}</XProviderContext.Provider>;
}
