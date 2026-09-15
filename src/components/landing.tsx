import { useEffect, useState } from "react";
import { signIn } from "@/lib/auth/client";
import { PitWell } from "@/components/pixel-art";
import { Button } from "@/components/ui/button";
import { XLogo } from "@/components/brand-icons";
import { MindshareTable, PostFeed } from "@/components/mindshare";
import {
  APP_NAME,
  SCORE,
  SCORE_PART_LABELS,
  SOCIALS,
  TICKER,
  postIntentUrl,
} from "@/lib/pixelpit";
import { listPublicPit, type YapRow, type YapperRow } from "@/lib/hunter-server";
import { usePitStore } from "@/lib/pit-store";

const SCORE_ROWS = [
  { label: SCORE_PART_LABELS.base, xp: SCORE.base, note: `${TICKER} or @${SOCIALS.xHandle}` },
  { label: SCORE_PART_LABELS.ticker, xp: SCORE.tickerBonus, note: "Ticker in the post" },
  { label: SCORE_PART_LABELS.mention, xp: SCORE.mentionBonus, note: "Tag the official account" },
  { label: SCORE_PART_LABELS.combo, xp: SCORE.comboBonus, note: "Both in one take" },
  { label: SCORE_PART_LABELS.original, xp: SCORE.originalBonus, note: "Original post, not a reply" },
  { label: SCORE_PART_LABELS.length, xp: SCORE.length80 + SCORE.length160, note: "Longer original takes" },
  { label: SCORE_PART_LABELS.streak, xp: SCORE.streakBonus, note: `${SCORE.streakMin}+ day streak` },
] as const;

export function Landing() {
  const windowId = usePitStore((s) => s.window);
  const setWindow = usePitStore((s) => s.setWindow);
  const [yappers7d, setYappers7d] = useState<YapperRow[]>([]);
  const [yappers30d, setYappers30d] = useState<YapperRow[]>([]);
  const [yappersAll, setYappersAll] = useState<YapperRow[]>([]);
  const [recent, setRecent] = useState<YapRow[]>([]);

  useEffect(() => {
    void listPublicPit()
      .then((data) => {
        setYappers7d(data.yappers7d);
        setYappers30d(data.yappers30d);
        setYappersAll(data.yappersAll);
        setRecent(data.recent);
      })
      .catch(() => {
        /* empty board is fine */
      });
  }, []);

  const rows =
    windowId === "30d" ? yappers30d : windowId === "all" ? yappersAll : yappers7d;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:pt-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="stagger-in space-y-6">
          <p className="font-mono text-xs tracking-[0.22em] text-sage uppercase">
            {APP_NAME} · Mindshare
          </p>
          <h1 className="text-[clamp(2.4rem,6vw,4.4rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            Post {TICKER}. Tag @{SOCIALS.xHandle}. Own the board.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted">
            PIXELPIT watches X for {TICKER} and @{SOCIALS.xHandle}. Connect,
            post a take — we pull it, score it, and rank mindshare. Quality
            climbs. Spam does not.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => signIn("grok-x", { callbackURL: "/" })}
            >
              <XLogo />
              Connect X
            </Button>
            <a
              href={postIntentUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-5 text-sm text-muted shadow-[var(--shadow-border)] transition-[color,box-shadow] duration-[var(--motion-quick)] hover:text-fg hover:shadow-[var(--shadow-border-hover)] sm:w-auto"
            >
              <XLogo />
              Draft a post
            </a>
          </div>
          <dl className="grid grid-cols-3 gap-3 pt-2 text-sm">
            <div className="rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]">
              <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
                Ticker
              </dt>
              <dd className="mt-1 font-mono text-lg">{TICKER}</dd>
            </div>
            <div className="rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]">
              <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
                Daily
              </dt>
              <dd className="mt-1 font-mono text-lg tabular-nums">
                {SCORE.dailyCap} posts
              </dd>
            </div>
            <div className="rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]">
              <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
                Window
              </dt>
              <dd className="mt-1 font-mono text-lg">7D</dd>
            </div>
          </dl>
        </div>
        <PitWell />
      </div>

      <section className="mt-16">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Leaderboard
        </p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">
          {TICKER} mindshare
        </h2>
        <div className="mt-5 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
          <MindshareTable rows={rows} windowId={windowId} onWindow={setWindow} />
        </div>
      </section>

      <section className="mt-16">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Feed
        </p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">
          Pulled from X
        </h2>
        <div className="mt-5 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
          <PostFeed
            posts={recent}
            empty={`Quiet for now. Post ${TICKER} or tag @${SOCIALS.xHandle} — PIXELPIT pulls it.`}
          />
        </div>
      </section>

      <section className="mt-16">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Scoring
        </p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">
          Quality over volume
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          We pull live public posts. Connect X. First scored post binds your
          handle. {SCORE.dailyCap} posts per day. Max {SCORE.maxXp} XP per post.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-left text-sm">
            <thead className="font-mono text-xs tracking-[0.14em] text-subtle uppercase">
              <tr className="border-b border-border">
                <th className="px-4 py-3 font-medium">Signal</th>
                <th className="px-4 py-3 font-medium">XP</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {SCORE_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{row.label}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-sage">
                    +{row.xp}
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Connect and post</h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
              Sign in with X, publish {TICKER}. We pull the post, score it, and
              you lock a wallet from the menu.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => signIn("grok-x", { callbackURL: "/" })}
          >
            <XLogo />
            Connect X
          </Button>
        </div>
      </section>
    </div>
  );
}
