import { useState, useEffect } from "react";
import { Check, ExternalLink, LoaderCircle } from "lucide-react";
import { authEnabled, signIn, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { TelegramLogo, XLogo } from "@/components/brand-icons";
import { PixelBars } from "@/components/pixel-art";
import { usePitStore } from "@/lib/pit-store";
import {
  APP_NAME,
  SOCIALS,
  STATUS_COPY,
  TASKS,
  TICKER,
  WL_XP,
  formatMindshare,
  type TaskDef,
} from "@/lib/pixelpit";
import type { HunterState } from "@/lib/hunter-server";
import { cn } from "@/lib/utils";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

function KindIcon({ kind }: { kind: TaskDef["kind"] }) {
  if (kind === "telegram") return <TelegramLogo className="size-3.5" />;
  if (kind === "wallet") return null;
  return <XLogo className="size-3.5" />;
}

function TaskRow({
  task,
  done,
  busy,
  onConfirm,
}: {
  task: TaskDef;
  done: boolean;
  busy: boolean;
  onConfirm: (id: string) => void;
}) {
  return (
    <li className="rounded-md bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {task.title}
            {done ? <Check className="size-3.5 text-sage" strokeWidth={2.25} /> : null}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{task.blurb}</p>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-sage">
          +{task.xp}
        </span>
      </div>
      {!done && task.href ? (
        <div className="mt-3 flex flex-col gap-2">
          <a
            href={task.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm px-3 text-sm text-fg shadow-[var(--shadow-border)] hover:bg-surface"
          >
            <KindIcon kind={task.kind} />
            {task.openLabel}
            <ExternalLink className="size-3.5 text-subtle" />
          </a>
          <Button
            variant="outline"
            block
            disabled={busy}
            onClick={() => onConfirm(task.id)}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : task.confirmLabel}
          </Button>
        </div>
      ) : null}
      {done ? (
        <p className="mt-2 font-mono text-xs tracking-[0.12em] text-sage uppercase">
          Cleared
        </p>
      ) : null}
    </li>
  );
}

function WalletBlock({
  hunter,
  busy,
  onSave,
}: {
  hunter: HunterState;
  busy: boolean;
  onSave: (address: string) => void;
}) {
  const [value, setValue] = useState(hunter.walletAddress ?? "");
  useEffect(() => {
    setValue(hunter.walletAddress ?? "");
  }, [hunter.walletAddress]);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="0x… or Solana"
        autoComplete="off"
        spellCheck={false}
        aria-label="Wallet address"
      />
      <Button type="submit" block disabled={busy}>
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : hunter.walletAddress ? (
          "Update wallet"
        ) : (
          "Save wallet"
        )}
      </Button>
      {hunter.walletChain ? (
        <p className="font-mono text-xs text-subtle">
          {hunter.walletChain === "evm" ? "EVM" : "Solana"} locked · +150 XP
        </p>
      ) : (
        <p className="text-xs text-subtle">One wallet per hunter. +150 XP.</p>
      )}
    </form>
  );
}

function SignedInMenu({
  hunter,
  busyId,
  onConfirm,
  onSave,
}: {
  hunter: HunterState;
  busyId: string | null;
  onConfirm: (id: string) => void;
  onSave: (address: string) => void;
}) {
  const { user } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );
  const completed = new Set(hunter.completedTaskIds);
  const socialTasks = TASKS.filter((task) => task.id !== "submit_wallet");
  const doneCount = hunter.completedTaskIds.length;

  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          You
        </p>
        <p className="mt-1 truncate text-sm font-medium">
          {hunter.xHandle ? `@${hunter.xHandle}` : hunter.displayName}
        </p>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted">
          {hunter.yapperTitle} · {formatMindshare(hunter.mindshare)} ·{" "}
          {hunter.yapCount} posts · {STATUS_COPY[hunter.wlStatus].label}
        </p>
      </section>

      <section>
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Circuit
        </p>
        <h2 className="mt-1 text-base font-medium">Day 01</h2>
        <p className="mt-1 text-xs text-muted">
          Follow, like, comment, repost, join Telegram. {doneCount}/{TASKS.length}{" "}
          cleared.
        </p>
        <ol className="mt-3 space-y-2">
          {socialTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              done={completed.has(task.id)}
              busy={busyId === task.id}
              onConfirm={onConfirm}
            />
          ))}
        </ol>
      </section>

      <section>
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Wallet
        </p>
        <h2 className="mt-1 text-base font-medium">WL / GTD address</h2>
        <p className="mt-1 text-xs text-muted">
          {STATUS_COPY[hunter.wlStatus].detail}
        </p>
        <p className="mt-1 font-mono text-xs text-subtle">
          WL at wallet + {WL_XP} XP. GTD when every Day 01 task is done.
        </p>
        <div className="mt-3">
          <WalletBlock
            hunter={hunter}
            busy={busyId === "submit_wallet"}
            onSave={onSave}
          />
        </div>
      </section>

      <section className="space-y-2">
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Official
        </p>
        <a
          href={SOCIALS.xUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <XLogo /> @{SOCIALS.xHandle}
        </a>
        <a
          href={SOCIALS.telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <TelegramLogo /> Telegram
        </a>
      </section>

      {authEnabled && !gateSession && user ? (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline disabled:cursor-wait"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      ) : null}
    </div>
  );
}

function GuestMenu() {
  return (
    <div className="space-y-8">
      <section>
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          {APP_NAME}
        </p>
        <h2 className="mt-1 text-base font-medium">Mindshare</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Post {TICKER} or tag @{SOCIALS.xHandle} on X. Connect — we pull the
          posts and rank mindshare.
        </p>
        <Button
          className="mt-4"
          block
          onClick={() => {
            usePitStore.getState().setMenuOpen(false);
            void signIn("grok-x", { callbackURL: "/" });
          }}
        >
          <XLogo />
          Connect X
        </Button>
      </section>
      <section className="space-y-2">
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Official
        </p>
        <a
          href={SOCIALS.xUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <XLogo /> @{SOCIALS.xHandle}
        </a>
        <a
          href={SOCIALS.telegramUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <TelegramLogo /> Telegram
        </a>
      </section>
      <section>
        <p className="font-mono text-xs tracking-[0.16em] text-subtle uppercase">
          Circuit
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Follow, like, comment, repost, and Telegram live in this menu after
          you connect — they stay off the board.
        </p>
      </section>
    </div>
  );
}

export function MenuButton() {
  const setMenuOpen = usePitStore((s) => s.setMenuOpen);
  return (
    <button
      type="button"
      onClick={() => setMenuOpen(true)}
      className="grid size-11 place-items-center text-sage transition-colors duration-[var(--motion-quick)] hover:text-fg"
      aria-label="Open menu"
    >
      <PixelBars className="size-4" />
    </button>
  );
}

export function PitMenu() {
  const menuOpen = usePitStore((s) => s.menuOpen);
  const setMenuOpen = usePitStore((s) => s.setMenuOpen);
  const hunter = usePitStore((s) => s.hunter);
  const busyId = usePitStore((s) => s.busyId);
  const handlers = usePitStore((s) => s.handlers);
  const { user, isPending } = useCurrentUserState();

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen} title={APP_NAME}>
      {user && hunter && handlers ? (
        <SignedInMenu
          hunter={hunter}
          busyId={busyId}
          onConfirm={handlers.onConfirmTask}
          onSave={handlers.onSaveWallet}
        />
      ) : isPending && user ? (
        <div className="h-40 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <GuestMenu />
      )}
    </Sheet>
  );
}

export function StatusBadge({ status }: { status: HunterState["wlStatus"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs tracking-[0.14em] uppercase",
        status === "gtd" && "bg-sage text-sage-fg",
        status === "wl" && "bg-accent text-accent-fg",
        status === "none" && "bg-surface-2 text-muted",
      )}
    >
      {STATUS_COPY[status].label}
    </span>
  );
}
