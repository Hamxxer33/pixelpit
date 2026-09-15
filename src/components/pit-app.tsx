import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { AppUser } from "@/lib/auth/use-current-user";
import {
  bindXHandle,
  completeTask,
  ensureHunter,
  listYaps,
  pullMyPosts,
  submitWallet,
  submitYap,
  type HunterState,
  type YapClaim,
  type YapRow,
  type YapperRow,
} from "@/lib/hunter-server";
import {
  APP_NAME,
  SOCIALS,
  TASKS,
  TICKER,
  formatMindshare,
  type TimeWindow,
} from "@/lib/pixelpit";
import { Button } from "@/components/ui/button";
import { MindshareTable, PostFeed, SubmitDesk } from "@/components/mindshare";
import { StatusBadge } from "@/components/pit-menu";
import { usePitStore, type PitView } from "@/lib/pit-store";
import { cn } from "@/lib/utils";

const VIEWS: readonly { id: PitView; label: string }[] = [
  { id: "board", label: "Leaderboard" },
  { id: "feed", label: "Feed" },
  { id: "submit", label: "Post" },
];

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message === "Unauthorized";
}

function failMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message !== "Unauthorized") {
    return error.message;
  }
  return fallback;
}

function pickBoard(
  windowId: TimeWindow,
  d7: YapperRow[],
  d30: YapperRow[],
  all: YapperRow[],
): YapperRow[] {
  if (windowId === "30d") return d30;
  if (windowId === "all") return all;
  return d7;
}

export function PitApp({ user }: { user: AppUser }) {
  const [hunter, setHunter] = useState<HunterState | null>(null);
  const [mine, setMine] = useState<YapRow[]>([]);
  const [recent, setRecent] = useState<YapRow[]>([]);
  const [yappers7d, setYappers7d] = useState<YapperRow[]>([]);
  const [yappers30d, setYappers30d] = useState<YapperRow[]>([]);
  const [yappersAll, setYappersAll] = useState<YapperRow[]>([]);
  const [claim, setClaim] = useState<YapClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const view = usePitStore((s) => s.view);
  const setView = usePitStore((s) => s.setView);
  const windowId = usePitStore((s) => s.window);
  const setWindow = usePitStore((s) => s.setWindow);

  const load = useCallback(async () => {
    try {
      const me = await ensureHunter({
        data: {
          displayName: user.displayName,
          avatarUrl: user.profileImageUrl,
        },
      });
      let hunterState = me;
      try {
        const pulled = await pullMyPosts();
        hunterState = pulled.hunter;
        if (!pulled.scan.skipped) {
          setScanNote(
            pulled.scan.credited > 0
              ? `Pulled ${pulled.scan.scanned} · scored ${pulled.scan.credited}`
              : pulled.scan.scanned > 0
                ? `Pulled ${pulled.scan.scanned} posts from X`
                : "Watching X. No new $PIT posts yet.",
          );
          if (pulled.scan.credited > 0) {
            toast.success(
              `+${pulled.scan.credited} post${pulled.scan.credited === 1 ? "" : "s"} scored from X`,
            );
          }
        }
      } catch {
        /* board still loads */
      }
      const lists = await listYaps();
      setHunter(hunterState);
      setMine(lists.mine);
      setRecent(lists.recent);
      setYappers7d(lists.yappers7d);
      setYappers30d(lists.yappers30d);
      setYappersAll(lists.yappersAll);
      setError(null);
    } catch (err) {
      if (isUnauthorized(err)) {
        setError("Session expired. Sign in again.");
        return;
      }
      setError(failMessage(err, "Could not load the pit."));
    } finally {
      setLoading(false);
    }
  }, [user.displayName, user.profileImageUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const onConfirmTask = useCallback(async (taskId: string) => {
    setBusyId(taskId);
    try {
      const next = await completeTask({ data: taskId });
      setHunter(next);
      const task = TASKS.find((item) => item.id === taskId);
      toast.success(`+${task?.xp ?? 0} XP`);
    } catch (err) {
      toast.error(failMessage(err, "Could not confirm that task."));
    } finally {
      setBusyId(null);
    }
  }, []);

  const onSaveWallet = useCallback(async (address: string) => {
    setBusyId("submit_wallet");
    try {
      const next = await submitWallet({ data: address });
      setHunter(next);
      toast.success("Wallet locked.");
    } catch (err) {
      toast.error(failMessage(err, "Could not save wallet."));
    } finally {
      setBusyId(null);
    }
  }, []);

  useEffect(() => {
    usePitStore.getState().syncSession({
      hunter,
      busyId,
      handlers: { onConfirmTask, onSaveWallet },
    });
  }, [hunter, busyId, onConfirmTask, onSaveWallet]);

  useEffect(() => {
    return () => {
      usePitStore.getState().syncSession({
        hunter: null,
        busyId: null,
        handlers: null,
      });
    };
  }, []);

  async function onClaim(url: string) {
    setBusyId("submit");
    try {
      const result = await submitYap({ data: url });
      setHunter(result.hunter);
      setClaim(result.claim);
      const lists = await listYaps();
      setMine(lists.mine);
      setRecent(lists.recent);
      setYappers7d(lists.yappers7d);
      setYappers30d(lists.yappers30d);
      setYappersAll(lists.yappersAll);
      toast.success(
        `+${result.claim.xp} XP · ${formatMindshare(result.hunter.mindshare)} mindshare`,
      );
    } catch (err) {
      toast.error(failMessage(err, "Could not score that post."));
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  async function onBind(handle: string) {
    setBusyId("submit");
    setScanning(true);
    try {
      const next = await bindXHandle({ data: handle });
      setHunter(next);
      const lists = await listYaps();
      setMine(lists.mine);
      setRecent(lists.recent);
      setYappers7d(lists.yappers7d);
      setYappers30d(lists.yappers30d);
      setYappersAll(lists.yappersAll);
      setScanNote(`Watching @${next.xHandle}`);
      toast.success(`Watching @${next.xHandle}`);
    } catch (err) {
      toast.error(failMessage(err, "Could not bind that handle."));
    } finally {
      setBusyId(null);
      setScanning(false);
    }
  }

  async function onPull() {
    setScanning(true);
    try {
      const pulled = await pullMyPosts();
      setHunter(pulled.hunter);
      const lists = await listYaps();
      setMine(lists.mine);
      setRecent(lists.recent);
      setYappers7d(lists.yappers7d);
      setYappers30d(lists.yappers30d);
      setYappersAll(lists.yappersAll);
      setScanNote(
        pulled.scan.credited > 0
          ? `Pulled ${pulled.scan.scanned} · scored ${pulled.scan.credited}`
          : pulled.scan.scanned > 0
            ? `Pulled ${pulled.scan.scanned} posts from X`
            : "No new posts yet. Publish $PIT, then pull again.",
      );
      if (pulled.scan.credited > 0) {
        toast.success(
          `+${pulled.scan.credited} post${pulled.scan.credited === 1 ? "" : "s"} scored from X`,
        );
      }
    } catch (err) {
      toast.error(failMessage(err, "Could not pull posts from X."));
    } finally {
      setScanning(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8">
        <div className="h-24 animate-pulse rounded-xl bg-surface" />
        <div className="h-80 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  if (!hunter) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-muted">{error ?? "Could not enter the pit."}</p>
        <Button className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  const rows = pickBoard(windowId, yappers7d, yappers30d, yappersAll);
  const rankLabel =
    hunter.yapRank > 0 ? `#${String(hunter.yapRank).padStart(2, "0")}` : "—";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-sage uppercase">
            {APP_NAME} · Mindshare
          </p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
            Post {TICKER}. Tag @{SOCIALS.xHandle}.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Ranked by share of the {TICKER} conversation. We pull public posts
            with {TICKER} or @{SOCIALS.xHandle}.
          </p>
        </div>
        <StatusBadge status={hunter.wlStatus} />
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
            Mindshare 7D
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">
            {formatMindshare(hunter.mindshare)}
          </dd>
        </div>
        <div className="rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
            Rank
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{rankLabel}</dd>
        </div>
        <div className="rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
            Posts
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{hunter.yapCount}</dd>
        </div>
        <div className="rounded-md bg-surface p-3 shadow-[var(--shadow-border)]">
          <dt className="font-mono text-xs tracking-[0.16em] text-muted uppercase">
            Streak
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{hunter.streak}d</dd>
        </div>
      </dl>
      <p className="mt-2 font-mono text-xs text-subtle">
        {hunter.yapperTitle}
        {hunter.xHandle ? ` · @${hunter.xHandle}` : ""} · {hunter.xp} XP
      </p>

      <div className="mt-8 flex gap-1 border-b border-border">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={cn(
              "h-11 px-4 text-sm transition-colors duration-[var(--motion-quick)]",
              view === item.id
                ? "border-b border-fg text-fg"
                : "text-muted hover:text-fg",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "board" ? (
          <MindshareTable rows={rows} windowId={windowId} onWindow={setWindow} />
        ) : null}
        {view === "feed" ? (
          <PostFeed
            posts={recent}
            empty="The pit is quiet. Post $PIT — we pull it."
          />
        ) : null}
        {view === "submit" ? (
          <SubmitDesk
            hunter={hunter}
            posts={mine}
            busy={busyId === "submit"}
            scanning={scanning}
            claim={claim}
            scanNote={scanNote}
            onClaim={onClaim}
            onBind={onBind}
            onPull={onPull}
          />
        ) : null}
      </div>
    </div>
  );
}
