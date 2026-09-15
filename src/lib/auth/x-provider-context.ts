/**
 * The provider id "Connect X" should start sign-in with, resolved on the server
 * (see `activeXProviderId` in `./x-oauth.server`) and carried down the tree by
 * `AuthProvider`.
 *
 * It has to travel this way rather than be fetched on demand: the credentials
 * that decide it are server-only, and the live-preview popup must open
 * synchronously inside the click handler, so the answer has to already be in
 * hand when the button is pressed. SSR resolves it before first paint.
 *
 * Kept out of `./provider` so that file exports only a component (fast refresh).
 */
import { createContext, useContext } from "react";
import { X_BROKER_PROVIDER_ID } from "./providers";

export const XProviderContext = createContext<string>(X_BROKER_PROVIDER_ID);

/** The provider id to pass to `signIn` for X. Falls back to the brokered one. */
export function useXProviderId(): string {
  return useContext(XProviderContext);
}
