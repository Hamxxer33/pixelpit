import {
  APP_NAME,
  SOCIALS,
  TICKER,
  mentionPattern,
  parseXHandle,
  sameHandle,
  tickerPattern,
} from "@/lib/pixelpit";
import { getXBearer, hasXCredentials, xCredentialSummary } from "@/lib/x-auth.server";

export type FetchedTweet = {
  id: string;
  text: string;
  handle: string;
  isReply: boolean;
  createdAt?: string;
};

function decodeEntities(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasXApi(): boolean {
  return hasXCredentials();
}

async function fromFx(id: string): Promise<FetchedTweet | null> {
  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { accept: "application/json", "user-agent": "PIXELPIT/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    tweet?: {
      id?: string;
      text?: string;
      author?: { screen_name?: string };
      replying_to?: string | null;
      replying_to_status?: string | null;
      created_at?: string;
    };
  };
  const tweet = payload.tweet;
  const text = tweet?.text?.trim();
  const handle = tweet?.author?.screen_name?.replace(/^@/, "").trim();
  if (!tweet || !text || !handle) return null;
  const isReply = Boolean(tweet.replying_to || tweet.replying_to_status);
  return {
    id: tweet.id ?? id,
    text,
    handle,
    isReply,
    createdAt: tweet.created_at,
  };
}

async function fromOembed(url: string, id: string): Promise<FetchedTweet | null> {
  const res = await fetch(
    `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`,
    {
      headers: { accept: "application/json", "user-agent": "PIXELPIT/1.0" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    html?: string;
    author_url?: string;
  };
  const html = payload.html ?? "";
  const paragraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const text = paragraph ? decodeEntities(paragraph) : "";
  const handle =
    payload.author_url?.match(/x\.com\/([^/?#]+)/i)?.[1] ??
    html.match(/@([A-Za-z0-9_]{1,15})/)?.[1] ??
    "";
  if (!text || !handle) return null;
  return { id, text, handle, isReply: false };
}

export async function fetchTweet(id: string, url: string): Promise<FetchedTweet> {
  try {
    const fx = await fromFx(id);
    if (fx) return fx;
  } catch {
    /* try oembed */
  }
  try {
    const embed = await fromOembed(url, id);
    if (embed) return embed;
  } catch {
    /* both failed */
  }
  throw new Error("Couldn't read that post. Make sure it's public and try again.");
}

function keepTweet(tweet: FetchedTweet, hunterHandles: Set<string>): boolean {
  if (tweet.text.startsWith("RT @")) return false;
  if (mentionPattern(SOCIALS.xHandle).test(tweet.text)) return true;
  if (new RegExp(APP_NAME, "i").test(tweet.text)) return true;
  if (sameHandle(tweet.handle, SOCIALS.xHandle)) return true;
  if (hunterHandles.has(tweet.handle.toLowerCase()) && tickerPattern().test(tweet.text)) {
    return true;
  }
  return false;
}

function dedupe(tweets: FetchedTweet[]): FetchedTweet[] {
  const seen = new Set<string>();
  const out: FetchedTweet[] = [];
  for (const tweet of tweets) {
    if (seen.has(tweet.id)) continue;
    seen.add(tweet.id);
    out.push(tweet);
  }
  return out;
}

type SynTweet = {
  id_str?: string;
  full_text?: string;
  text?: string;
  permalink?: string;
  in_reply_to_status_id_str?: string | null;
  in_reply_to_user_id_str?: string | null;
  created_at?: string;
  user?: { screen_name?: string };
};

async function fromSyndication(handle: string): Promise<FetchedTweet[]> {
  const safe = parseXHandle(handle);
  const res = await fetch(
    `https://syndication.twitter.com/srv/timeline-profile/screen-name/${safe}`,
    {
      headers: {
        accept: "text/html",
        "user-agent": "Mozilla/5.0 (compatible; PIXELPIT/1.0; +https://x.com/pixellPIT)",
      },
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) return [];
  const payload = JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        timeline?: { entries?: { content?: { tweet?: SynTweet } }[] };
      };
    };
  };
  const entries = payload.props?.pageProps?.timeline?.entries ?? [];
  const tweets: FetchedTweet[] = [];
  for (const entry of entries) {
    const tweet = entry.content?.tweet;
    const id = tweet?.id_str?.trim();
    const text = (tweet?.full_text ?? tweet?.text ?? "").trim();
    const author = tweet?.user?.screen_name?.replace(/^@/, "").trim() || safe;
    if (!id || !text) continue;
    tweets.push({
      id,
      text,
      handle: author,
      isReply: Boolean(tweet?.in_reply_to_status_id_str || tweet?.in_reply_to_user_id_str),
      createdAt: tweet?.created_at,
    });
  }
  return tweets;
}

type ApiTweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  in_reply_to_user_id?: string | null;
  conversation_id?: string;
};

type ApiUser = { id: string; username: string };

/**
 * A GET against the X API, returning `null` on any failure.
 *
 * The failure is LOGGED rather than swallowed, because the status is the whole
 * diagnosis and the caller cannot see it: 401 is a bad bearer, 403 usually
 * means the plan does not include this endpoint (`/2/tweets/search/recent`
 * needs Basic or above — it is not on the Free tier), and 429 is a rate limit.
 * Without this line the app silently falls through to scraping and looks like
 * "the X API is not pulling" with nothing to point at.
 */
async function xGet<T>(path: string): Promise<T | null> {
  const token = await getXBearer();
  if (!token) {
    console.error(`[x-api] no bearer for ${endpointName(path)} — ${xCredentialSummary()}`);
    return null;
  }
  let res: Response;
  try {
    res = await fetch(`https://api.twitter.com${path}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    console.error(
      `[x-api] ${endpointName(path)} threw: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(
      `[x-api] ${endpointName(path)} -> ${res.status} ${res.statusText} ${detail.slice(0, 300)}`,
    );
    return null;
  }
  return (await res.json()) as T;
}

/** The endpoint path without its query string — safe to log, no handles or tokens. */
function endpointName(path: string): string {
  return path.split("?", 1)[0];
}

async function fromSearch(): Promise<FetchedTweet[]> {
  const query = encodeURIComponent(`(@${SOCIALS.xHandle} OR ${APP_NAME} OR ${TICKER}) -is:retweet`);
  const payload = await xGet<{
    data?: ApiTweet[];
    includes?: { users?: ApiUser[] };
  }>(
    `/2/tweets/search/recent?query=${query}&max_results=100&tweet.fields=created_at,in_reply_to_user_id,author_id,conversation_id,text&expansions=author_id&user.fields=username`,
  );
  if (!payload?.data?.length) return [];
  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user.username]));
  const out: FetchedTweet[] = [];
  for (const tweet of payload.data) {
    const handle = tweet.author_id ? users.get(tweet.author_id) : undefined;
    if (!handle) continue;
    out.push({
      id: tweet.id,
      text: tweet.text,
      handle,
      isReply: Boolean(tweet.in_reply_to_user_id),
      createdAt: tweet.created_at,
    });
  }
  return out;
}

async function fromApiUser(handle: string): Promise<FetchedTweet[]> {
  const safe = parseXHandle(handle);
  const user = await xGet<{ data?: { id: string; username: string } }>(
    `/2/users/by/username/${safe}?user.fields=username`,
  );
  const id = user?.data?.id;
  const username = user?.data?.username ?? safe;
  if (!id) return [];
  const payload = await xGet<{ data?: ApiTweet[] }>(
    `/2/users/${id}/tweets?max_results=50&exclude=retweets&tweet.fields=created_at,in_reply_to_user_id,conversation_id,text`,
  );
  return (payload?.data ?? []).map((tweet) => ({
    id: tweet.id,
    text: tweet.text,
    handle: username,
    isReply: Boolean(tweet.in_reply_to_user_id),
    createdAt: tweet.created_at,
  }));
}

export async function collectPitTweets(
  handles: readonly string[],
): Promise<{ tweets: FetchedTweet[]; source: string }> {
  const unique = Array.from(
    new Set(
      [SOCIALS.xHandle, ...handles]
        .map((handle) => {
          try {
            return parseXHandle(handle);
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    ),
  ).slice(0, 12);

  const buckets: FetchedTweet[][] = [];
  const hunterSet = new Set(unique.map((handle) => handle.toLowerCase()));
  // Counted per source so the recorded `source` reflects where the posts ACTUALLY
  // came from. It previously defaulted to "profile" and stayed there even when
  // every post had come from the syndication scrape, which made a completely
  // dead X API look like a working one.
  let searchCount = 0;
  let apiProfileCount = 0;
  let syndicationCount = 0;

  const bearer = await getXBearer();
  if (bearer) {
    try {
      const searched = await fromSearch();
      searchCount = searched.length;
      if (searched.length > 0) buckets.push(searched);
    } catch (err) {
      console.error(`[x-api] search threw: ${err instanceof Error ? err.message : String(err)}`);
    }
    const apiProfiles = await Promise.all(
      unique.map((handle) => fromApiUser(handle).catch(() => [] as FetchedTweet[])),
    );
    apiProfileCount = apiProfiles.flat().length;
    buckets.push(...apiProfiles);
  } else {
    console.error(`[x-api] skipping API entirely — ${xCredentialSummary()}`);
  }

  if (buckets.flat().length === 0) {
    const syn = await Promise.all(
      unique.map((handle) => fromSyndication(handle).catch(() => [] as FetchedTweet[])),
    );
    syndicationCount = syn.flat().length;
    buckets.push(...syn);
  }

  const collected = dedupe(buckets.flat());
  const tweets = collected.filter((tweet) => keepTweet(tweet, hunterSet));
  const source =
    searchCount > 0
      ? "search"
      : apiProfileCount > 0
        ? "api-profile"
        : syndicationCount > 0
          ? "syndication"
          : "none";

  // One line per scan: where the posts came from, and how many survived the
  // relevance filter. `source: syndication` means the X API returned nothing
  // and this is scraped data — check the [x-api] lines above it for why.
  console.info(
    `[x-api] scan source=${source} handles=${unique.length} ` +
      `search=${searchCount} apiProfile=${apiProfileCount} syndication=${syndicationCount} ` +
      `collected=${collected.length} kept=${tweets.length}`,
  );

  return { tweets, source };
}
