/** Server-only X app credentials. Never import this from client code. */

const KEY = process.env.X_API_KEY?.trim() || "";
const SECRET = process.env.X_API_SECRET?.trim() || "";

let cached: { token: string; at: number } | null = null;
const TTL_MS = 50 * 60 * 1000;

export function hasXCredentials(): boolean {
  return Boolean(KEY && SECRET);
}

/**
 * Which X credentials the server can see, for startup/scan diagnostics.
 * Booleans only — never the values.
 */
export function xCredentialSummary(): string {
  return [
    `key=${KEY ? "set" : "MISSING"}`,
    `secret=${SECRET ? "set" : "MISSING"}`,
    `bearerEnv=${process.env.X_BEARER_TOKEN?.trim() ? "set" : "unset"}`,
  ].join(" ");
}

export async function getXBearer(): Promise<string | null> {
  const fromEnv = process.env.X_BEARER_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.token;
  if (!KEY || !SECRET) return null;
  const basic = Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  const res = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      "user-agent": "PIXELPIT/1.0",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    // The status is the whole diagnosis: 401 = wrong key/secret, 403 = the app
    // is not attached to a Project or lacks API access, 429 = rate limited.
    // Never log the body beyond a snippet, and never the token itself.
    const detail = await res.text().catch(() => "");
    console.error(
      `[x-api] bearer mint failed: ${res.status} ${res.statusText} ${detail.slice(0, 200)}`,
    );
    return cached?.token ?? null;
  }
  const payload = (await res.json()) as { access_token?: string };
  const token = payload.access_token?.trim();
  if (!token) {
    console.error("[x-api] bearer mint returned no access_token");
    return cached?.token ?? null;
  }
  cached = { token, at: Date.now() };
  return token;
}
