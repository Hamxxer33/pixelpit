/**
 * The hosts this deployment actually answers on.
 *
 * Better Auth has to know the app's real origin for two separate reasons:
 *
 *  1. **`baseURL`** — it becomes the OAuth `redirect_uri`. Get it wrong and the
 *     upstream sends the visitor to the wrong place (or refuses outright).
 *  2. **`trustedOrigins`** — the CSRF check on credentialed auth POSTs. A host
 *     missing here makes `POST /api/auth/sign-in/oauth2` fail with a 403
 *     `Invalid origin` *before* any redirect happens, so "Connect X" looks like
 *     a dead button.
 *
 * The template only ever knew two kinds of origin: the sandbox live preview
 * (`*.grok-sandbox.com`) and whatever `BETTER_AUTH_URL` the Grok deployer
 * injects. An app deployed straight to Vercel by hand gets neither, so the
 * dynamic `baseURL` fell through to its `http://localhost:8080` fallback and
 * the real host was never trusted. These helpers recover the host from the
 * platform's own env instead.
 *
 * Pure and dependency-free (env in, hosts out) so it can be unit-tested and
 * imported from anywhere; the values it reads are server-side only.
 */

/** A `process.env`-shaped bag. */
export type HostEnv = Record<string, string | undefined>;

/**
 * Env vars that carry a host — or a full URL — this deployment is reachable at.
 *
 * `APP_PUBLIC_HOSTS` is the manual escape hatch (comma- or space-separated) for
 * domains the platform doesn't advertise. The `VERCEL_*` vars are set by Vercel
 * itself: `VERCEL_PROJECT_PRODUCTION_URL` is the project's stable production
 * domain (the custom one when there is one), `VERCEL_BRANCH_URL` the branch
 * alias, and `VERCEL_URL` the immutable per-deployment URL.
 */
const HOST_ENV_KEYS = [
  "APP_PUBLIC_HOSTS",
  "BETTER_AUTH_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_URL",
] as const;

/** Platform-assigned domains — never worth deriving a `www.` sibling for. */
const PLATFORM_SUFFIXES = [".vercel.app", ".grok-sandbox.com"];

/**
 * Reduce one env value to a bare lowercase host, or `null` when it isn't one.
 *
 * Accepts what the various sources actually hand us: a bare host
 * (`www.pixelpit.app`), a host:port, or a full URL (`https://www.pixelpit.app/`).
 */
export function normalizeHost(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  // Strip scheme and anything from the first path separator, then drop a
  // leading `user@` and any trailing dot.
  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const host = withoutScheme.split(/[/?#]/, 1)[0].split("@").pop() ?? "";
  const cleaned = host.replace(/\.$/, "").toLowerCase();
  if (!cleaned) return null;
  // A host has no whitespace, no comma, and no wildcard — callers split lists
  // themselves and wildcards belong to the preview allowlist, not here.
  if (/[\s,*]/.test(cleaned)) return null;
  return cleaned;
}

/** Split one env value into candidate hosts (`APP_PUBLIC_HOSTS` may list several). */
function splitHosts(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\s]+/)
    .map(normalizeHost)
    .filter((host): host is string => host !== null);
}

/**
 * The apex/`www.` sibling of a custom domain, so a visitor on
 * `www.pixelpit.app` and one on `pixelpit.app` are both trusted however the
 * platform reports the production domain. Platform-assigned hostnames never get
 * a sibling — nothing serves `www.<deployment>.vercel.app`.
 */
function sibling(host: string): string | null {
  if (PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  if (host.startsWith("www.")) {
    const apex = host.slice(4);
    return apex.includes(".") ? apex : null;
  }
  // Only pair a registrable-looking domain; `localhost` and bare labels stay as-is.
  return host.includes(".") ? `www.${host}` : null;
}

/**
 * Every public host for this deployment, de-duplicated and in a stable order.
 * Empty in the sandbox live preview and in local dev, where none of the source
 * vars are set — both of those are already covered by the preview allowlist and
 * the loopback origins.
 */
export function publicHosts(env: HostEnv): string[] {
  const seen = new Set<string>();
  for (const key of HOST_ENV_KEYS) {
    for (const host of splitHosts(env[key])) {
      seen.add(host);
      const pair = sibling(host);
      if (pair) seen.add(pair);
    }
  }
  return [...seen];
}

/** The `https://` origins for {@link publicHosts} — what `trustedOrigins` compares against. */
export function publicOrigins(env: HostEnv): string[] {
  return publicHosts(env).map((host) => `https://${host}`);
}
