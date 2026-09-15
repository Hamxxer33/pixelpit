/** Server-only X app credentials. Never import this from client code. */

const KEY = process.env.X_API_KEY?.trim() || "";
const SECRET = process.env.X_API_SECRET?.trim() || "";

let cached: { token: string; at: number } | null = null;
const TTL_MS = 50 * 60 * 1000;

export function hasXCredentials(): boolean {
  return Boolean(KEY && SECRET);
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
  if (!res.ok) return cached?.token ?? null;
  const payload = (await res.json()) as { access_token?: string };
  const token = payload.access_token?.trim();
  if (!token) return cached?.token ?? null;
  cached = { token, at: Date.now() };
  return token;
}
