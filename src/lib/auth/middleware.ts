import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the caller's
 * verified user id. When deployed the session cookie is same-origin and rides
 * along automatically. In the live preview the client also forwards the bearer
 * token (partitioned cookies) via the `.client` hook below — call sites do not
 * thread it themselves.
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getSql } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listTodos = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const sql = await getSql();
 *       return sql`select * from todos where user_id = ${context.userId}`;
 *     });
 *
 * Signed out with auth on (live preview included) -> throws `UnauthorizedError`
 * (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
 * shipped default) it resolves the shared dev user — but throws instead when a
 * `DATABASE_URL` is also set, so an app without sign-in must not use this at
 * all. On the auth-on path, use it on every server function that touches
 * per-user data and scope every query by `context.userId`.
 */
export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    // Privy keeps the session in the browser and hands out a short-lived access
    // token, so EVERY call forwards one — there is no cookie to ride along.
    // `getPrivyAccessToken` refreshes it when it is close to expiring.
    // Falls back to the Better Auth preview bearer when Privy is not configured.
    const { getPrivyAccessToken } = await import("./privy-token");
    const { getBearerToken } = await import("./client");
    const bearerToken =
      (await getPrivyAccessToken()) ?? getBearerToken() ?? undefined;
    return next({ sendContext: { bearerToken } });
  })
  .server(async ({ next, context }) => {
    // ONLY import `*.server` modules here. This file is dual client/server
    // (bearer hook on the client). A plain `./isolation` path was renamed to
    // `isolation.server.ts` — keep this import in sync so image `tsc` resolves
    // it, and so Vite does not ship `@tanstack/react-start/server` to the browser.
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireUserId } = await import("./verify.server");
    // Reject scripted cross-site/sibling requests before touching per-user data.
    assertSameSiteRequest();
    const userId = await requireUserId(context.bearerToken);
    return next({ context: { userId } });
  });
