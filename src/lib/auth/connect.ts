/**
 * The one "Connect X" entry point the UI calls.
 *
 * `signIn` rejects on every failure path — a blocked popup, a cancelled
 * upstream, a rejected origin — and every call site used to be a bare
 * `void signIn(...)`, so a failure was swallowed and the button just looked
 * dead. Funnelling them through here means a failed connect always says
 * something.
 */
import { toast } from "sonner";
import { signIn } from "./client";

/** The provider id backing the X button (see `./providers`). */
export const X_PROVIDER_ID = "grok-x";

/**
 * Turn a Better Auth / browser failure into something a visitor can act on.
 * Unrecognized failures keep their own message — it is more useful than a
 * generic one when something new breaks.
 */
function readableError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/invalid origin/i.test(message)) {
    return "Sign-in isn't configured for this domain yet.";
  }
  if (/pop-?up/i.test(message)) {
    return "Pop-up blocked — allow pop-ups for this site and try again.";
  }
  if (/cancel/i.test(message)) return "Sign-in was cancelled.";
  if (/failed to fetch|network/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return message || "Couldn't connect X. Try again.";
}

/**
 * Report a failed sign-in: a short line for the visitor, the raw one for
 * whoever is looking at the console — `readableError` deliberately loses detail
 * that only a developer can act on.
 */
function report(err: unknown): void {
  console.error("[auth] sign-in failed:", err);
  toast.error(readableError(err));
}

/** Start X sign-in, reporting anything that goes wrong. */
export function connectX(callbackURL = "/"): void {
  void signIn(X_PROVIDER_ID, { callbackURL }).catch(report);
}

/** Start sign-in with any provider id, reporting anything that goes wrong. */
export function connectProvider(providerId: string, callbackURL = "/"): void {
  void signIn(providerId, { callbackURL }).catch(report);
}
