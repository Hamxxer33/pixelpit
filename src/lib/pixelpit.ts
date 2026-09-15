export const APP_NAME = "PIXELPIT";
export const TICKER = "$PIT";

export const SOCIALS = {
  xHandle: "pixellPIT",
  xUrl: "https://x.com/pixellPIT",
  followIntent: "https://x.com/intent/follow?screen_name=pixellPIT",
  tweetUrl: "https://x.com/pixellPIT",
  telegramUrl: "https://t.me/pixelpit",
  telegramName: "PIXELPIT",
} as const;

export type WlStatus = "none" | "wl" | "gtd";

export type TaskKind = "x" | "telegram" | "wallet";

export type TaskDef = {
  id: string;
  kind: TaskKind;
  title: string;
  blurb: string;
  xp: number;
  href: string | null;
  confirmLabel: string;
  openLabel: string;
};

export const TASKS: readonly TaskDef[] = [
  {
    id: "follow_x",
    kind: "x",
    title: "Follow on X",
    blurb: `Follow @${SOCIALS.xHandle} — the only official account.`,
    xp: 100,
    href: SOCIALS.followIntent,
    confirmLabel: "Confirm follow",
    openLabel: "Open X",
  },
  {
    id: "like_x",
    kind: "x",
    title: "Like the drop post",
    blurb: "Like the pinned PIXELPIT post on X.",
    xp: 50,
    href: SOCIALS.tweetUrl,
    confirmLabel: "Confirm like",
    openLabel: "Open post",
  },
  {
    id: "comment_x",
    kind: "x",
    title: "Comment on the drop",
    blurb: "Leave a real comment on the official post.",
    xp: 80,
    href: SOCIALS.tweetUrl,
    confirmLabel: "Confirm comment",
    openLabel: "Open post",
  },
  {
    id: "repost_x",
    kind: "x",
    title: "Repost",
    blurb: "Repost the official drop so the pit spreads.",
    xp: 80,
    href: SOCIALS.tweetUrl,
    confirmLabel: "Confirm repost",
    openLabel: "Open post",
  },
  {
    id: "join_tg",
    kind: "telegram",
    title: "Join Telegram",
    blurb: `Join the ${SOCIALS.telegramName} channel for calls and mint info.`,
    xp: 100,
    href: SOCIALS.telegramUrl,
    confirmLabel: "Confirm join",
    openLabel: "Open Telegram",
  },
  {
    id: "submit_wallet",
    kind: "wallet",
    title: "Submit wallet",
    blurb: "Drop an EVM or Solana wallet for WL / GTD.",
    xp: 150,
    href: null,
    confirmLabel: "Wallet saved",
    openLabel: "Save wallet",
  },
] as const;

export const SOCIAL_TASK_IDS = TASKS.filter((t) => t.id !== "submit_wallet").map(
  (t) => t.id,
) as readonly string[];

export const TOTAL_XP = TASKS.reduce((sum, task) => sum + task.xp, 0);
export const WL_XP = 250;

export const SCORE = {
  dailyCap: 5,
  minBody: 24,
  base: 35,
  tickerBonus: 20,
  mentionBonus: 20,
  comboBonus: 25,
  originalBonus: 15,
  length80: 10,
  length160: 15,
  streakBonus: 10,
  streakMin: 3,
  maxXp: 150,
} as const;

/** @deprecated use SCORE — kept so existing imports keep typechecking during the swap */
export const YAP = SCORE;

export type TimeWindow = "7d" | "30d" | "all";

export const TIME_WINDOWS: readonly { id: TimeWindow; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All" },
];

export const SCORE_PART_LABELS = {
  base: "Signal",
  ticker: TICKER,
  mention: `@${SOCIALS.xHandle}`,
  combo: "Combo",
  length: "Depth",
  original: "Original",
  streak: "Streak",
} as const;

export const POST_PROMPTS = [
  {
    id: "thesis",
    label: "Thesis",
    text: `Day 01 in the pit. Hunters lock wallets and climb for WL. ${TICKER} @${SOCIALS.xHandle}`,
  },
  {
    id: "signal",
    label: "Signal",
    text: `Quality over spam. A real take with ${TICKER} or @${SOCIALS.xHandle} scores. Ticker-only gets rejected.`,
  },
  {
    id: "gtd",
    label: "GTD",
    text: `WL is the floor. GTD is the pit. ${TICKER} @${SOCIALS.xHandle} I'm locking in.`,
  },
] as const;

export const STATUS_COPY: Record<
  WlStatus,
  { label: string; detail: string }
> = {
  none: {
    label: "Scout",
    detail: "No allocation yet. Post, finish the circuit, and lock a wallet.",
  },
  wl: {
    label: "WL",
    detail: "Whitelist locked. Clear every Day 01 task to upgrade to GTD.",
  },
  gtd: {
    label: "GTD",
    detail: "Guaranteed. You cleared Day 01. Keep posting for mindshare.",
  },
};

export function deriveStatus(
  xp: number,
  hasWallet: boolean,
  completedIds: readonly string[],
): WlStatus {
  const allDone = TASKS.every((task) => completedIds.includes(task.id));
  if (allDone && hasWallet) return "gtd";
  if (hasWallet && xp >= WL_XP) return "wl";
  return "none";
}

export function parseWallet(
  raw: string,
): { address: string; chain: "evm" | "sol" } {
  const address = raw.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { address, chain: "evm" };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return { address, chain: "sol" };
  }
  throw new Error("Enter a valid EVM (0x…) or Solana wallet.");
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function taskById(id: string): TaskDef | undefined {
  return TASKS.find((task) => task.id === id);
}

const TWEET_HOSTS = new Set([
  "x.com",
  "twitter.com",
  "mobile.twitter.com",
  "www.x.com",
  "www.twitter.com",
  "vxtwitter.com",
  "fxtwitter.com",
]);

export function parseTweetUrl(raw: string): { id: string; url: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Paste a full X post link.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Paste a full X post link.");
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (!TWEET_HOSTS.has(host) && !TWEET_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("Paste an x.com post link.");
  }
  const match = parsed.pathname.match(/\/status(?:es)?\/(\d{5,25})/);
  if (!match) {
    throw new Error("Paste a direct post link (x.com/…/status/…).");
  }
  const id = match[1];
  return { id, url: `https://x.com/i/status/${id}` };
}

export function mentionPattern(handle: string): RegExp {
  const safe = handle.replace(/[^\w]/g, "");
  return new RegExp(`@${safe}\\b`, "i");
}

export function tickerPattern(): RegExp {
  return /\$PIT\b/i;
}

export function sameHandle(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return (
    a.replace(/^@/, "").toLowerCase() === b.replace(/^@/, "").toLowerCase()
  );
}

export function parseXHandle(raw: string): string {
  const handle = raw.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new Error("Enter a valid X handle.");
  }
  return handle;
}

export function hasPitSignal(
  text: string,
  officialHandle: string,
  authorHandle?: string,
): boolean {
  if (tickerPattern().test(text)) return true;
  if (mentionPattern(officialHandle).test(text)) return true;
  if (sameHandle(authorHandle, officialHandle)) return true;
  return false;
}

export type YapScoreParts = {
  base: number;
  ticker: number;
  mention: number;
  combo: number;
  length: number;
  original: number;
  streak: number;
};

export type YapScore = {
  xp: number;
  hasTicker: boolean;
  hasMention: boolean;
  isOriginal: boolean;
  parts: YapScoreParts;
};

export type YapScoreContext = {
  isReply?: boolean;
  streak?: number;
  authorHandle?: string;
};

export function stripYapBody(text: string, officialHandle: string): string {
  return text
    .replace(tickerPattern(), " ")
    .replace(mentionPattern(officialHandle), " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function yapBodyKey(text: string, officialHandle: string): string {
  return stripYapBody(text, officialHandle)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

export function scoreYap(
  text: string,
  officialHandle: string,
  ctx: YapScoreContext = {},
): YapScore {
  const hasTicker = tickerPattern().test(text);
  const hasMention =
    mentionPattern(officialHandle).test(text) ||
    sameHandle(ctx.authorHandle, officialHandle);
  if (!hasTicker && !hasMention) {
    throw new Error(`Post must include ${TICKER} or @${officialHandle}.`);
  }
  const stripped = stripYapBody(text, officialHandle);
  if (stripped.length < SCORE.minBody) {
    throw new Error("Add a real take. Ticker-only posts don't count.");
  }
  const isOriginal = !ctx.isReply;
  const streak = ctx.streak ?? 0;
  const parts: YapScoreParts = {
    base: SCORE.base,
    ticker: hasTicker ? SCORE.tickerBonus : 0,
    mention: hasMention ? SCORE.mentionBonus : 0,
    combo: hasTicker && hasMention ? SCORE.comboBonus : 0,
    length:
      (stripped.length >= 160 ? SCORE.length160 : 0) +
      (stripped.length >= 80 ? SCORE.length80 : 0),
    original: isOriginal ? SCORE.originalBonus : 0,
    streak: streak >= SCORE.streakMin ? SCORE.streakBonus : 0,
  };
  const raw =
    parts.base +
    parts.ticker +
    parts.mention +
    parts.combo +
    parts.length +
    parts.original +
    parts.streak;
  return {
    xp: Math.min(raw, SCORE.maxXp),
    hasTicker,
    hasMention,
    isOriginal,
    parts,
  };
}

export function postIntentUrl(draft?: string): string {
  const text = draft ?? `${TICKER} @${SOCIALS.xHandle} `;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export const yapIntentUrl = postIntentUrl;

export function mindsharePct(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatMindshare(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

export function currentStreak(
  isoDates: readonly string[],
  todayIso: string,
): number {
  if (isoDates.length === 0) return 0;
  const set = new Set(isoDates);
  const yest = shiftIso(todayIso, -1);
  if (!set.has(todayIso) && !set.has(yest)) return 0;
  let cursor = set.has(todayIso) ? todayIso : yest;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shiftIso(cursor, -1);
  }
  return n;
}

export function streakAfterYap(
  isoDates: readonly string[],
  todayIso: string,
): number {
  if (isoDates.includes(todayIso)) {
    return currentStreak(isoDates, todayIso);
  }
  return currentStreak([todayIso, ...isoDates], todayIso);
}

export function hunterTitle(postCount: number, mindshare: number): string {
  if (postCount <= 0) return "Silent";
  if (mindshare >= 15 || postCount >= 25) return "Mindshare";
  if (postCount >= 10) return "Signal";
  if (postCount >= 3) return "Voice";
  return "Echo";
}

export const yapperTitle = hunterTitle;

function dateFromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function shiftIso(iso: string, days: number): string {
  const d = dateFromIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
