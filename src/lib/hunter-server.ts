import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  SOCIALS,
  SOCIAL_TASK_IDS,
  YAP,
  deriveStatus,
  mindsharePct,
  parseTweetUrl,
  parseWallet,
  parseXHandle,
  scoreYap,
  streakAfterYap,
  currentStreak,
  taskById,
  tickerPattern,
  mentionPattern,
  sameHandle,
  yapBodyKey,
  yapperTitle,
  type WlStatus,
  type YapScore,
} from "@/lib/pixelpit";

export type HunterState = {
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  walletChain: "evm" | "sol" | null;
  xHandle: string | null;
  xp: number;
  yapXp: number;
  yapXp7d: number;
  yapCount: number;
  yapsToday: number;
  mindshare: number;
  mindshareAll: number;
  streak: number;
  yapRank: number;
  yapperTitle: string;
  wlStatus: WlStatus;
  completedTaskIds: string[];
  rank: number;
};

export type BoardRow = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  yapCount: number;
  wlStatus: WlStatus;
  isYou: boolean;
};

export type YapperRow = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  xHandle: string | null;
  yapXp: number;
  yapCount: number;
  mindshare: number;
  isYou: boolean;
};

export type YapRow = {
  tweetId: string;
  tweetUrl: string;
  authorHandle: string;
  body: string;
  hasTicker: boolean;
  hasMention: boolean;
  isOriginal: boolean;
  xpAwarded: number;
  createdAt: string;
};

export type YapClaim = YapScore & {
  tweetId: string;
  tweetUrl: string;
  authorHandle: string;
  body: string;
};

export type YapLists = {
  mine: YapRow[];
  recent: YapRow[];
  yappers7d: YapperRow[];
  yappers30d: YapperRow[];
  yappersAll: YapperRow[];
};

export type ScanResult = {
  scanned: number;
  credited: number;
  source: string;
  skipped: boolean;
};

type SqlClient = Awaited<ReturnType<typeof import("@/lib/db").getSql>>;

type HunterRow = {
  display_name: string;
  avatar_url: string | null;
  wallet_address: string | null;
  wallet_chain: string | null;
  x_handle: string | null;
  xp: number | string;
  wl_status: string;
};

function asInt(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asDateIso(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function mapYapper(
  rows: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    x_handle: string | null;
    yap_xp: number | string;
    yap_count: number | string;
  }[],
  totalXp: number,
  userId: string,
): YapperRow[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    xHandle: row.x_handle,
    yapXp: asInt(row.yap_xp),
    yapCount: asInt(row.yap_count),
    mindshare: mindsharePct(asInt(row.yap_xp), totalXp),
    isYou: row.user_id === userId,
  }));
}

async function loadState(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  userId: string,
): Promise<HunterState> {
  const hunters = await sql<HunterRow>`
    select display_name, avatar_url, wallet_address, wallet_chain, x_handle, xp, wl_status
    from hunters
    where user_id = ${userId}
  `;
  const hunter = hunters[0];
  if (!hunter) {
    throw new Error("Hunter not found.");
  }
  const completions = await sql<{ task_id: string }>`
    select task_id from task_completions where user_id = ${userId}
  `;
  const completedTaskIds = completions.map((row) => row.task_id);
  const xp = asInt(hunter.xp);
  const hasWallet = Boolean(hunter.wallet_address);
  const wlStatus = deriveStatus(xp, hasWallet, completedTaskIds);
  if (wlStatus !== hunter.wl_status) {
    await sql`
      update hunters
      set wl_status = ${wlStatus}, updated_at = now()
      where user_id = ${userId}
    `;
  }
  const rankRows = await sql<{ rank: number | string }>`
    select (count(*) + 1)::int as rank
    from hunters
    where xp > ${xp}
  `;
  const yapStats = await sql<{
    yap_count: number | string;
    yap_xp: number | string;
    yap_xp_7d: number | string;
  }>`
    select
      count(*)::int as yap_count,
      coalesce(sum(xp_awarded), 0)::int as yap_xp,
      coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '7 days'), 0)::int as yap_xp_7d
    from yaps
    where user_id = ${userId}
  `;
  const todayRows = await sql<{ yaps_today: number | string }>`
    select count(*)::int as yaps_today
    from yaps
    where user_id = ${userId} and created_at >= current_date
  `;
  const pitTotals = await sql<{
    yap_xp: number | string;
    yap_xp_7d: number | string;
  }>`
    select
      coalesce(sum(xp_awarded), 0)::int as yap_xp,
      coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '7 days'), 0)::int as yap_xp_7d
    from yaps
  `;
  const streakRows = await sql<{ d: Date | string }>`
    select distinct created_at::date as d
    from yaps
    where user_id = ${userId}
    order by d desc
    limit 90
  `;
  const todayIsoRows = await sql<{ d: Date | string }>`
    select current_date as d
  `;
  const todayIso = asDateIso(todayIsoRows[0]?.d);
  const streakDates = streakRows.map((row) => asDateIso(row.d)).filter(Boolean);
  const stats = yapStats[0];
  const totals = pitTotals[0];
  const yapXp = asInt(stats?.yap_xp);
  const yapXp7d = asInt(stats?.yap_xp_7d);
  const yapCount = asInt(stats?.yap_count);
  const mindshare = mindsharePct(yapXp7d, asInt(totals?.yap_xp_7d));
  const mindshareAll = mindsharePct(yapXp, asInt(totals?.yap_xp));
  const rank7d = await sql<{ rank: number | string }>`
    select (count(*) + 1)::int as rank
    from (
      select user_id, sum(xp_awarded) as yxp
      from yaps
      where created_at >= now() - interval '7 days'
      group by user_id
    ) t
    where yxp > ${yapXp7d}
  `;
  const yapRank = yapCount === 0 ? 0 : asInt(rank7d[0]?.rank ?? 1);
  const streak = currentStreak(streakDates, todayIso);
  return {
    displayName: hunter.display_name,
    avatarUrl: hunter.avatar_url,
    walletAddress: hunter.wallet_address,
    walletChain:
      hunter.wallet_chain === "evm" || hunter.wallet_chain === "sol" ? hunter.wallet_chain : null,
    xHandle: hunter.x_handle,
    xp,
    yapXp,
    yapXp7d,
    yapCount,
    yapsToday: asInt(todayRows[0]?.yaps_today),
    mindshare,
    mindshareAll,
    streak,
    yapRank,
    yapperTitle: yapperTitle(yapCount, mindshare),
    wlStatus,
    completedTaskIds,
    rank: asInt(rankRows[0]?.rank ?? 1),
  };
}

export const ensureHunter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { displayName?: string | null; avatarUrl?: string | null }) => {
    const displayName = (input.displayName ?? "Hunter").trim().slice(0, 32) || "Hunter";
    const raw = input.avatarUrl?.trim() ?? "";
    let avatarUrl: string | null = null;
    if (raw.startsWith("https://") || raw.startsWith("http://")) {
      avatarUrl = raw.slice(0, 512);
    }
    return { displayName, avatarUrl };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into hunters (user_id, display_name, avatar_url)
      values (${context.userId}, ${data.displayName}, ${data.avatarUrl})
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        avatar_url = coalesce(excluded.avatar_url, hunters.avatar_url),
        updated_at = now()
    `;
    return loadState(sql, context.userId);
  });

export const completeTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((taskId: string) => {
    if (!SOCIAL_TASK_IDS.includes(taskId)) {
      throw new Error("Unknown task.");
    }
    return taskId;
  })
  .handler(async ({ context, data: taskId }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const task = taskById(taskId);
    if (!task) throw new Error("Unknown task.");
    const existing = await sql<{ task_id: string }>`
      select task_id from task_completions
      where user_id = ${context.userId} and task_id = ${taskId}
    `;
    if (existing.length === 0) {
      await sql`
        insert into task_completions (user_id, task_id, xp_awarded)
        values (${context.userId}, ${taskId}, ${task.xp})
      `;
      await sql`
        update hunters
        set xp = xp + ${task.xp}, updated_at = now()
        where user_id = ${context.userId}
      `;
    }
    return loadState(sql, context.userId);
  });

export const submitWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((address: string) => parseWallet(address))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from hunters
      where wallet_address = ${data.address} and user_id <> ${context.userId}
    `;
    if (taken.length > 0) {
      throw new Error("That wallet is already locked to another hunter.");
    }
    await sql`
      update hunters
      set wallet_address = ${data.address},
          wallet_chain = ${data.chain},
          updated_at = now()
      where user_id = ${context.userId}
    `;
    const existing = await sql<{ task_id: string }>`
      select task_id from task_completions
      where user_id = ${context.userId} and task_id = ${"submit_wallet"}
    `;
    if (existing.length === 0) {
      const task = taskById("submit_wallet");
      const xp = task?.xp ?? 150;
      await sql`
        insert into task_completions (user_id, task_id, xp_awarded)
        values (${context.userId}, ${"submit_wallet"}, ${xp})
      `;
      await sql`
        update hunters
        set xp = xp + ${xp}, updated_at = now()
        where user_id = ${context.userId}
      `;
    }
    return loadState(sql, context.userId);
  });

export const submitYap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: string) => parseTweetUrl(raw))
  .handler(async ({ context, data }): Promise<{ hunter: HunterState; claim: YapClaim }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { fetchTweet } = await import("@/lib/yap-fetch.server");
    const tweet = await fetchTweet(data.id, data.url);
    const result = await creditTweet(sql, context.userId, tweet);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    const state = await loadState(sql, context.userId);
    return { hunter: state, claim: result.claim };
  });

type CreditOk = { ok: true; claim: YapClaim };
type CreditSkip = { ok: false; reason: string };

async function creditTweet(
  sql: SqlClient,
  userId: string,
  tweet: import("@/lib/yap-fetch.server").FetchedTweet,
): Promise<CreditOk | CreditSkip> {
  const claimed = await sql<{ user_id: string }>`
    select user_id from yaps where tweet_id = ${tweet.id}
  `;
  if (claimed.length > 0) {
    return { ok: false, reason: "That post is already in the pit." };
  }
  const today = await sql<{ n: number | string }>`
    select count(*)::int as n
    from yaps
    where user_id = ${userId} and created_at >= current_date
  `;
  if (asInt(today[0]?.n) >= YAP.dailyCap) {
    return {
      ok: false,
      reason: `Daily cap is ${YAP.dailyCap} posts. Come back tomorrow.`,
    };
  }
  const handle = tweet.handle.toLowerCase();
  const hunter = await sql<{ x_handle: string | null }>`
    select x_handle from hunters where user_id = ${userId}
  `;
  const bound = hunter[0]?.x_handle?.toLowerCase() ?? null;
  if (bound && bound !== handle) {
    return {
      ok: false,
      reason: `This hunter is bound to @${bound}. Post from that account.`,
    };
  }
  if (!bound) {
    const takenHandle = await sql<{ user_id: string }>`
      select user_id from hunters
      where lower(x_handle) = ${handle} and user_id <> ${userId}
    `;
    if (takenHandle.length > 0) {
      return {
        ok: false,
        reason: `@${tweet.handle} is already bound to another hunter.`,
      };
    }
  }
  const bodyKey = yapBodyKey(tweet.text, SOCIALS.xHandle);
  if (bodyKey.length < 12) {
    return {
      ok: false,
      reason: "Add a real take. Ticker-only posts don't count.",
    };
  }
  const dup = await sql<{ tweet_id: string }>`
    select tweet_id from yaps where body_key = ${bodyKey}
  `;
  if (dup.length > 0) {
    return {
      ok: false,
      reason: "That take is already in the pit. Write an original one.",
    };
  }
  const streakRows = await sql<{ d: Date | string }>`
    select distinct created_at::date as d
    from yaps
    where user_id = ${userId}
    order by d desc
    limit 90
  `;
  const todayIsoRows = await sql<{ d: Date | string }>`
    select current_date as d
  `;
  const todayIso = asDateIso(todayIsoRows[0]?.d);
  const streakDates = streakRows.map((row) => asDateIso(row.d)).filter(Boolean);
  const nextStreak = streakAfterYap(streakDates, todayIso);
  let score;
  try {
    score = scoreYap(tweet.text, SOCIALS.xHandle, {
      isReply: tweet.isReply,
      streak: nextStreak,
      authorHandle: tweet.handle,
    });
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Could not score that post.",
    };
  }
  const url = `https://x.com/${tweet.handle}/status/${tweet.id}`;
  await sql`
    insert into yaps (
      user_id, tweet_id, tweet_url, author_handle, body,
      has_ticker, has_mention, is_original, body_key, xp_awarded
    )
    values (
      ${userId}, ${tweet.id}, ${url}, ${tweet.handle},
      ${tweet.text.slice(0, 2000)}, ${score.hasTicker}, ${score.hasMention},
      ${score.isOriginal}, ${bodyKey}, ${score.xp}
    )
  `;
  if (!bound) {
    await sql`
      update hunters
      set x_handle = ${tweet.handle},
          xp = xp + ${score.xp},
          updated_at = now()
      where user_id = ${userId}
    `;
  } else {
    await sql`
      update hunters
      set xp = xp + ${score.xp}, updated_at = now()
      where user_id = ${userId}
    `;
  }
  return {
    ok: true,
    claim: {
      ...score,
      tweetId: tweet.id,
      tweetUrl: url,
      authorHandle: tweet.handle,
      body: tweet.text,
    },
  };
}

function toYapRow(row: {
  tweet_id: string;
  tweet_url: string;
  author_handle: string;
  body: string;
  has_ticker: boolean;
  has_mention: boolean;
  is_original: boolean;
  xp_awarded: number | string;
  created_at: Date | string;
}): YapRow {
  return {
    tweetId: row.tweet_id,
    tweetUrl: row.tweet_url,
    authorHandle: row.author_handle,
    body: row.body,
    hasTicker: Boolean(row.has_ticker),
    hasMention: Boolean(row.has_mention),
    isOriginal: Boolean(row.is_original),
    xpAwarded: asInt(row.xp_awarded),
    createdAt: typeof row.created_at === "string" ? row.created_at : row.created_at.toISOString(),
  };
}

export const listYaps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<YapLists> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const mine = await sql<{
      tweet_id: string;
      tweet_url: string;
      author_handle: string;
      body: string;
      has_ticker: boolean;
      has_mention: boolean;
      is_original: boolean;
      xp_awarded: number | string;
      created_at: Date | string;
    }>`
      select tweet_id, tweet_url, author_handle, body, has_ticker, has_mention,
             is_original, xp_awarded, created_at
      from yaps
      where user_id = ${context.userId}
      order by created_at desc
      limit 20
    `;
    const recent = await sql<{
      tweet_id: string;
      tweet_url: string;
      author_handle: string;
      body: string;
      has_ticker: boolean;
      has_mention: boolean;
      is_original: boolean;
      xp_awarded: number | string;
      created_at: Date | string;
    }>`
      select
        p.tweet_id,
        p.tweet_url,
        p.author_handle,
        p.body,
        p.has_ticker,
        p.has_mention,
        p.is_original,
        coalesce(y.xp_awarded, 0)::int as xp_awarded,
        coalesce(p.posted_at, p.scanned_at) as created_at
      from pit_posts p
      left join yaps y on y.tweet_id = p.tweet_id
      order by coalesce(p.posted_at, p.scanned_at) desc
      limit 24
    `;
    const totals = await sql<{
      yap_xp: number | string;
      yap_xp_7d: number | string;
      yap_xp_30d: number | string;
    }>`
      select
        coalesce(sum(xp_awarded), 0)::int as yap_xp,
        coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '7 days'), 0)::int as yap_xp_7d,
        coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '30 days'), 0)::int as yap_xp_30d
      from yaps
    `;
    const yappers7d = await sql<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      x_handle: string | null;
      yap_xp: number | string;
      yap_count: number | string;
    }>`
      select
        h.user_id,
        h.display_name,
        h.avatar_url,
        h.x_handle,
        coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
        count(y.id)::int as yap_count
      from yaps y
      join hunters h on h.user_id = y.user_id
      where y.created_at >= now() - interval '7 days'
      group by h.user_id, h.display_name, h.avatar_url, h.x_handle
      order by yap_xp desc, yap_count desc, h.user_id
      limit 25
    `;
    const yappers30d = await sql<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      x_handle: string | null;
      yap_xp: number | string;
      yap_count: number | string;
    }>`
      select
        h.user_id,
        h.display_name,
        h.avatar_url,
        h.x_handle,
        coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
        count(y.id)::int as yap_count
      from yaps y
      join hunters h on h.user_id = y.user_id
      where y.created_at >= now() - interval '30 days'
      group by h.user_id, h.display_name, h.avatar_url, h.x_handle
      order by yap_xp desc, yap_count desc, h.user_id
      limit 25
    `;
    const yappersAll = await sql<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      x_handle: string | null;
      yap_xp: number | string;
      yap_count: number | string;
    }>`
      select
        h.user_id,
        h.display_name,
        h.avatar_url,
        h.x_handle,
        coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
        count(y.id)::int as yap_count
      from yaps y
      join hunters h on h.user_id = y.user_id
      group by h.user_id, h.display_name, h.avatar_url, h.x_handle
      order by yap_xp desc, yap_count desc, h.user_id
      limit 25
    `;
    return {
      mine: mine.map(toYapRow),
      recent: recent.map(toYapRow),
      yappers7d: mapYapper(yappers7d, asInt(totals[0]?.yap_xp_7d), context.userId),
      yappers30d: mapYapper(yappers30d, asInt(totals[0]?.yap_xp_30d), context.userId),
      yappersAll: mapYapper(yappersAll, asInt(totals[0]?.yap_xp), context.userId),
    };
  });

export const getBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      xp: number | string;
      yap_count: number | string;
      wl_status: string;
    }>`
      select
        h.user_id,
        h.display_name,
        h.avatar_url,
        h.xp,
        h.wl_status,
        (select count(*)::int from yaps y where y.user_id = h.user_id) as yap_count
      from hunters h
      order by h.xp desc, h.created_at asc
      limit 25
    `;
    return rows.map((row, index): BoardRow => ({
      rank: index + 1,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      xp: asInt(row.xp),
      yapCount: asInt(row.yap_count),
      wlStatus: (row.wl_status === "wl" || row.wl_status === "gtd"
        ? row.wl_status
        : "none") as WlStatus,
      isYou: row.user_id === context.userId,
    }));
  });

const SCAN_ID = "global";
const SCAN_COOLDOWN_MS = 45_000;

async function loadYapperLists(sql: SqlClient, userId: string) {
  const totals = await sql<{
    yap_xp: number | string;
    yap_xp_7d: number | string;
    yap_xp_30d: number | string;
  }>`
    select
      coalesce(sum(xp_awarded), 0)::int as yap_xp,
      coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '7 days'), 0)::int as yap_xp_7d,
      coalesce(sum(xp_awarded) filter (where created_at >= now() - interval '30 days'), 0)::int as yap_xp_30d
    from yaps
  `;
  const yappers7d = await sql<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    x_handle: string | null;
    yap_xp: number | string;
    yap_count: number | string;
  }>`
    select
      h.user_id,
      h.display_name,
      h.avatar_url,
      h.x_handle,
      coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
      count(y.id)::int as yap_count
    from yaps y
    join hunters h on h.user_id = y.user_id
    where y.created_at >= now() - interval '7 days'
    group by h.user_id, h.display_name, h.avatar_url, h.x_handle
    order by yap_xp desc, yap_count desc, h.user_id
    limit 25
  `;
  const yappers30d = await sql<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    x_handle: string | null;
    yap_xp: number | string;
    yap_count: number | string;
  }>`
    select
      h.user_id,
      h.display_name,
      h.avatar_url,
      h.x_handle,
      coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
      count(y.id)::int as yap_count
    from yaps y
    join hunters h on h.user_id = y.user_id
    where y.created_at >= now() - interval '30 days'
    group by h.user_id, h.display_name, h.avatar_url, h.x_handle
    order by yap_xp desc, yap_count desc, h.user_id
    limit 25
  `;
  const yappersAll = await sql<{
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    x_handle: string | null;
    yap_xp: number | string;
    yap_count: number | string;
  }>`
    select
      h.user_id,
      h.display_name,
      h.avatar_url,
      h.x_handle,
      coalesce(sum(y.xp_awarded), 0)::int as yap_xp,
      count(y.id)::int as yap_count
    from yaps y
    join hunters h on h.user_id = y.user_id
    group by h.user_id, h.display_name, h.avatar_url, h.x_handle
    order by yap_xp desc, yap_count desc, h.user_id
    limit 25
  `;
  return {
    yappers7d: mapYapper(yappers7d, asInt(totals[0]?.yap_xp_7d), userId),
    yappers30d: mapYapper(yappers30d, asInt(totals[0]?.yap_xp_30d), userId),
    yappersAll: mapYapper(yappersAll, asInt(totals[0]?.yap_xp), userId),
  };
}

async function loadFeed(sql: SqlClient): Promise<YapRow[]> {
  const recent = await sql<{
    tweet_id: string;
    tweet_url: string;
    author_handle: string;
    body: string;
    has_ticker: boolean;
    has_mention: boolean;
    is_original: boolean;
    xp_awarded: number | string;
    created_at: Date | string;
  }>`
    select
      p.tweet_id,
      p.tweet_url,
      p.author_handle,
      p.body,
      p.has_ticker,
      p.has_mention,
      p.is_original,
      coalesce(y.xp_awarded, 0)::int as xp_awarded,
      coalesce(p.posted_at, p.scanned_at) as created_at
    from pit_posts p
    left join yaps y on y.tweet_id = p.tweet_id
    order by coalesce(p.posted_at, p.scanned_at) desc
    limit 24
  `;
  if (recent.length > 0) return recent.map(toYapRow);
  const fallback = await sql<{
    tweet_id: string;
    tweet_url: string;
    author_handle: string;
    body: string;
    has_ticker: boolean;
    has_mention: boolean;
    is_original: boolean;
    xp_awarded: number | string;
    created_at: Date | string;
  }>`
    select tweet_id, tweet_url, author_handle, body, has_ticker, has_mention,
           is_original, xp_awarded, created_at
    from yaps
    order by created_at desc
    limit 24
  `;
  return fallback.map(toYapRow);
}

async function runScan(sql: SqlClient, extraHandles: readonly string[]): Promise<ScanResult> {
  const prior = await sql<{ last_at: Date | string; found: number | string }>`
    select last_at, found from pit_scan where id = ${SCAN_ID}
  `;
  const lastAt = prior[0]?.last_at;
  const lastMs =
    lastAt instanceof Date ? lastAt.getTime() : lastAt ? Date.parse(String(lastAt)) : 0;
  if (lastMs && Date.now() - lastMs < SCAN_COOLDOWN_MS) {
    return {
      scanned: asInt(prior[0]?.found),
      credited: 0,
      source: "cache",
      skipped: true,
    };
  }

  const hunters = await sql<{ x_handle: string | null }>`
    select x_handle from hunters where x_handle is not null
  `;
  const handles = [
    ...extraHandles,
    ...hunters.map((row) => row.x_handle).filter((h): h is string => Boolean(h)),
  ];
  const { collectPitTweets } = await import("@/lib/yap-fetch.server");
  const { tweets, source } = await collectPitTweets(handles);

  // Which authors actually came back, so a feed full of posts nobody recognises
  // can be traced to the handle that pulled them in. Handles are public.
  const authors = [...new Set(tweets.map((t) => t.handle.toLowerCase()))];
  console.info(
    `[scan] source=${source} watching=${handles.length} kept=${tweets.length} ` +
      `authors=${authors.slice(0, 20).join(",") || "none"}`,
  );

  for (const tweet of tweets) {
    const url = `https://x.com/${tweet.handle}/status/${tweet.id}`;
    const hasTicker = tickerPattern().test(tweet.text);
    const hasMention =
      mentionPattern(SOCIALS.xHandle).test(tweet.text) || sameHandle(tweet.handle, SOCIALS.xHandle);
    const postedAt = tweet.createdAt
      ? (() => {
          const d = new Date(tweet.createdAt);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        })()
      : null;
    await sql`
      insert into pit_posts (
        tweet_id, tweet_url, author_handle, body,
        has_ticker, has_mention, is_original, posted_at, scanned_at
      )
      values (
        ${tweet.id}, ${url}, ${tweet.handle}, ${tweet.text.slice(0, 2000)},
        ${hasTicker}, ${hasMention}, ${!tweet.isReply},
        ${postedAt}, now()
      )
      on conflict (tweet_id) do update set
        body = excluded.body,
        has_ticker = excluded.has_ticker,
        has_mention = excluded.has_mention,
        is_original = excluded.is_original,
        scanned_at = now()
    `;
  }

  const bound = await sql<{ user_id: string; x_handle: string }>`
    select user_id, x_handle from hunters where x_handle is not null
  `;
  const byHandle = new Map(bound.map((row) => [row.x_handle.toLowerCase(), row.user_id]));
  let credited = 0;
  let unbound = 0;
  for (const tweet of tweets) {
    const userId = byHandle.get(tweet.handle.toLowerCase());
    if (!userId) {
      // Stored in the public feed but credited to nobody — these are the posts
      // that show up on the board without belonging to a hunter.
      unbound += 1;
      continue;
    }
    const result = await creditTweet(sql, userId, tweet);
    if (result.ok) credited += 1;
  }
  console.info(
    `[scan] credited=${credited} unboundAuthors=${unbound} boundHunters=${bound.length}`,
  );

  await sql`
    insert into pit_scan (id, last_at, source, found)
    values (${SCAN_ID}, now(), ${source}, ${tweets.length})
    on conflict (id) do update set
      last_at = now(),
      source = excluded.source,
      found = excluded.found
  `;
  return { scanned: tweets.length, credited, source, skipped: false };
}

export const ingestPit = createServerFn({ method: "POST" }).handler(
  async (): Promise<ScanResult> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    return runScan(sql, []);
  },
);

export const bindXHandle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: string) => parseXHandle(raw))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const taken = await sql<{ user_id: string }>`
      select user_id from hunters
      where lower(x_handle) = ${data.toLowerCase()} and user_id <> ${context.userId}
    `;
    if (taken.length > 0) {
      throw new Error(`@${data} is already bound to another hunter.`);
    }
    const current = await sql<{ x_handle: string | null }>`
      select x_handle from hunters where user_id = ${context.userId}
    `;
    const bound = current[0]?.x_handle;
    if (bound && bound.toLowerCase() !== data.toLowerCase()) {
      throw new Error(`This hunter is bound to @${bound}.`);
    }
    await sql`
      update hunters
      set x_handle = ${data}, updated_at = now()
      where user_id = ${context.userId}
    `;
    await runScan(sql, [data]);
    return loadState(sql, context.userId);
  });

export const pullMyPosts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ hunter: HunterState; scan: ScanResult }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const hunter = await sql<{ x_handle: string | null }>`
      select x_handle from hunters where user_id = ${context.userId}
    `;
    const handle = hunter[0]?.x_handle;
    const scan = await runScan(sql, handle ? [handle] : []);
    return { hunter: await loadState(sql, context.userId), scan };
  });

export const listPublicPit = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    recent: YapRow[];
    yappers7d: YapperRow[];
    yappers30d: YapperRow[];
    yappersAll: YapperRow[];
  }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    try {
      await runScan(sql, []);
    } catch {
      /* feed still loads from what we already have */
    }
    const boards = await loadYapperLists(sql, "");
    return {
      recent: await loadFeed(sql),
      ...boards,
    };
  },
);
