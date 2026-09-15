import { useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XLogo } from "@/components/brand-icons";
import {
  POST_PROMPTS,
  SCORE,
  SCORE_PART_LABELS,
  SOCIALS,
  TICKER,
  TIME_WINDOWS,
  formatMindshare,
  mentionPattern,
  postIntentUrl,
  tickerPattern,
  type TimeWindow,
  type YapScoreParts,
} from "@/lib/pixelpit";
import type { HunterState, YapClaim, YapRow, YapperRow } from "@/lib/hunter-server";
import { cn } from "@/lib/utils";

export function PitMark({ text }: { text: string }) {
  const pattern = new RegExp(
    `(${tickerPattern().source}|${mentionPattern(SOCIALS.xHandle).source})`,
    "gi",
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const hit =
          tickerPattern().test(part) || mentionPattern(SOCIALS.xHandle).test(part);
        tickerPattern().lastIndex = 0;
        mentionPattern(SOCIALS.xHandle).lastIndex = 0;
        return hit ? (
          <span key={`${part}-${index}`} className="text-sage">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

function ClaimBreakdown({ claim }: { claim: YapClaim }) {
  const entries = (Object.keys(SCORE_PART_LABELS) as (keyof YapScoreParts)[])
    .map((key) => ({
      key,
      label: SCORE_PART_LABELS[key],
      xp: claim.parts[key],
    }))
    .filter((row) => row.xp > 0);
  return (
    <div className="rounded-md bg-surface-2 p-3">
      <p className="font-mono text-xs tracking-[0.16em] text-sage uppercase">
        Last score · +{claim.xp} XP
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        <PitMark
          text={
            claim.body.length > 180 ? `${claim.body.slice(0, 180)}…` : claim.body
          }
        />
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-muted sm:grid-cols-3">
        {entries.map((row) => (
          <li key={row.key} className="flex justify-between gap-2">
            <span>{row.label}</span>
            <span className="text-sage">+{row.xp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PostFeed({
  posts,
  empty,
}: {
  posts: YapRow[];
  empty: string;
}) {
  if (posts.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <ol className="divide-y divide-border">
      {posts.map((post) => (
        <li key={post.tweetId} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg">@{post.authorHandle}</span>
              {" · "}
              <PitMark
                text={
                  post.body.length > 180
                    ? `${post.body.slice(0, 180)}…`
                    : post.body
                }
              />
            </p>
            <span className="shrink-0 font-mono text-xs tabular-nums text-sage">
              {post.xpAwarded > 0 ? `+${post.xpAwarded}` : "—"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs tracking-[0.12em] text-subtle uppercase">
            {post.hasTicker ? <span>{TICKER}</span> : null}
            {post.hasMention ? <span>@{SOCIALS.xHandle}</span> : null}
            {post.isOriginal ? <span>Original</span> : <span>Reply</span>}
            <a
              href={post.tweetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              Post <ExternalLink className="size-3" />
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SubmitDesk({
  hunter,
  posts,
  busy,
  scanning,
  claim,
  scanNote,
  onClaim,
  onBind,
  onPull,
}: {
  hunter: HunterState;
  posts: YapRow[];
  busy: boolean;
  scanning: boolean;
  claim: YapClaim | null;
  scanNote: string | null;
  onClaim: (url: string) => Promise<void>;
  onBind: (handle: string) => Promise<void>;
  onPull: () => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState(hunter.xHandle ?? "");
  const remaining = Math.max(0, SCORE.dailyCap - hunter.yapsToday);
  const working = busy || scanning;

  return (
    <div>
      <p className="max-w-xl text-sm leading-relaxed text-muted">
        PIXELPIT watches X for {TICKER} and @{SOCIALS.xHandle}. Post from your
        bound account — we pull it. Originals beat replies. Copies and
        ticker-only spam are rejected.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {POST_PROMPTS.map((prompt) => (
          <a
            key={prompt.id}
            href={postIntentUrl(prompt.text)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-sm px-3 text-sm text-muted shadow-[var(--shadow-border)] transition-[color,box-shadow] duration-[var(--motion-quick)] hover:text-fg hover:shadow-[var(--shadow-border-hover)]"
          >
            {prompt.label}
          </a>
        ))}
        <a
          href={postIntentUrl()}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg transition-[transform,background-color] duration-[var(--motion-quick)] hover:bg-fg active:scale-[0.96]"
        >
          <XLogo />
          Post on X
        </a>
        <Button
          type="button"
          variant="outline"
          disabled={working}
          onClick={() => void onPull()}
        >
          {scanning ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            "Pull posts"
          )}
        </Button>
      </div>

      {hunter.xHandle ? (
        <p className="mt-3 font-mono text-xs text-subtle">
          Watching @{hunter.xHandle} · {remaining}/{SCORE.dailyCap} left today ·
          streak {hunter.streak}
        </p>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void onBind(handle);
          }}
        >
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@yourhandle"
            autoComplete="off"
            spellCheck={false}
            aria-label="X handle"
          />
          <Button type="submit" disabled={working} className="sm:w-44">
            {working ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              "Watch my X"
            )}
          </Button>
        </form>
      )}

      {scanNote ? (
        <p className="mt-2 font-mono text-xs text-sage">{scanNote}</p>
      ) : null}

      {claim ? (
        <div className="mt-4">
          <ClaimBreakdown claim={claim} />
        </div>
      ) : null}

      <details className="mt-6">
        <summary className="cursor-pointer font-mono text-xs tracking-[0.14em] text-subtle uppercase">
          Have a link
        </summary>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void onClaim(url).then(() => setUrl(""));
          }}
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://x.com/you/status/…"
            autoComplete="off"
            spellCheck={false}
            aria-label="X post link"
          />
          <Button type="submit" disabled={working || remaining === 0} className="sm:w-40">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : "Score post"}
          </Button>
        </form>
      </details>

      <div className="mt-8">
        <p className="mb-3 font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Your posts
        </p>
        <PostFeed
          posts={posts}
          empty="No scored posts yet. Publish with $PIT, then hit Pull posts."
        />
      </div>
    </div>
  );
}

export function MindshareTable({
  rows,
  windowId,
  onWindow,
}: {
  rows: YapperRow[];
  windowId: TimeWindow;
  onWindow: (id: TimeWindow) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">
          Share of the {TICKER} conversation this window.
        </p>
        <div className="flex rounded-sm bg-surface-2 p-1">
          {TIME_WINDOWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onWindow(item.id)}
              className={cn(
                "h-9 min-w-11 rounded-xs px-3 font-mono text-xs tracking-[0.12em] uppercase transition-colors duration-[var(--motion-quick)]",
                windowId === item.id
                  ? "bg-surface text-fg shadow-[var(--shadow-border)]"
                  : "text-subtle hover:text-fg",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_minmax(8rem,1.4fr)_4.5rem_4.5rem] gap-3 px-1 pb-2 font-mono text-xs tracking-[0.14em] text-subtle uppercase sm:grid">
        <span>#</span>
        <span>Hunter</span>
        <span>Mindshare</span>
        <span className="text-right">Posts</span>
        <span className="text-right">XP</span>
      </div>

      {rows.length === 0 ? (
        <p className="border-t border-border py-8 text-sm text-muted">
          No ranked hunters in this window. Post {TICKER} and take first
          mindshare.
        </p>
      ) : (
        <ol className="divide-y divide-border border-t border-border">
          {rows.map((row) => {
            const label = row.xHandle ? `@${row.xHandle}` : row.displayName;
            return (
              <li
                key={`${row.rank}-${label}`}
                className={cn(
                  "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(8rem,1.4fr)_4.5rem_4.5rem]",
                  row.isYou && "bg-surface-2/60",
                )}
              >
                <span className="font-mono text-xs tabular-nums text-subtle">
                  {String(row.rank).padStart(2, "0")}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  {row.avatarUrl ? (
                    <img
                      src={row.avatarUrl}
                      alt=""
                      className="size-8 shrink-0 rounded-xs object-cover outline outline-1 -outline-offset-1 outline-fg/10"
                    />
                  ) : (
                    <span className="grid size-8 shrink-0 place-items-center rounded-xs bg-surface-2 text-xs text-muted">
                      {label.replace(/^@/, "").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm">
                    {label}
                    {row.isYou ? (
                      <span className="ml-2 font-mono text-xs tracking-[0.12em] text-sage uppercase">
                        You
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="mind-bar h-full rounded-full bg-sage"
                        style={{
                          width: `${Math.min(100, Math.max(row.mindshare, 2))}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-xs tabular-nums">
                      {formatMindshare(row.mindshare)}
                    </span>
                  </div>
                </div>
                <span className="text-right font-mono text-xs tabular-nums text-fg sm:hidden">
                  {formatMindshare(row.mindshare)}
                </span>
                <span className="hidden text-right font-mono text-xs tabular-nums text-muted sm:block">
                  {row.yapCount}
                </span>
                <span className="hidden text-right font-mono text-xs tabular-nums text-muted sm:block">
                  {row.yapXp}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
