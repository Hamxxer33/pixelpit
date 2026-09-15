import { Link } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { authEnabled, signIn, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { XLogo } from "@/components/brand-icons";
import { MenuButton } from "@/components/pit-menu";
import { APP_NAME, SOCIALS, TICKER } from "@/lib/pixelpit";

const subscribeToNothing = () => () => {};
const noGateSessionOnServer = () => false;

const TAPE = [
  APP_NAME,
  TICKER,
  "MINDSHARE",
  "7D WINDOW",
  "QUALITY OVER VOLUME",
  `TAG @${SOCIALS.xHandle}`,
  "LOCK WL",
  "GTD IS THE PIT",
  "POST TO CLIMB",
] as const;

function Tape() {
  const line = TAPE.join("   ·   ");
  return (
    <div className="pit-marquee" aria-hidden>
      <div className="pit-marquee-track">
        <span className="pr-8">{line}</span>
        <span className="pr-8">{line}</span>
      </div>
    </div>
  );
}

function EnterChip() {
  return (
    <button
      type="button"
      onClick={() => signIn("grok-x", { callbackURL: "/" })}
      className="pit-chip"
    >
      <XLogo className="size-3.5" />
      <span className="hidden sm:inline">CONNECT_X</span>
      <span className="sm:hidden">X</span>
      <span className="pit-cursor" aria-hidden />
    </button>
  );
}

function AccountChip({
  sessionUser,
}: {
  sessionUser: { id: string; email: string | null } | null;
}) {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateSessionOnServer,
  );

  if (user) {
    const label = user.displayName ?? user.primaryEmail ?? "Hunter";
    return (
      <div className="flex items-center gap-2">
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-7 object-cover"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))",
            }}
          />
        ) : (
          <span className="grid size-7 place-items-center bg-surface-2 font-mono text-xs text-muted">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[7rem] truncate font-mono text-xs tracking-[0.12em] uppercase sm:inline">
          {label}
        </span>
        {authEnabled && !gateSession && (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut().catch(() => setSigningOut(false));
            }}
            className="font-mono text-xs tracking-[0.12em] text-subtle uppercase hover:text-fg disabled:cursor-wait"
          >
            {signingOut ? "…" : "OUT"}
          </button>
        )}
      </div>
    );
  }

  if (isPending && sessionUser) {
    return <div className="h-8 w-24 animate-pulse bg-surface-2" aria-hidden />;
  }

  return <EnterChip />;
}

export function SiteHeader({
  sessionUser,
}: {
  sessionUser: { id: string; email: string | null } | null;
}) {
  return (
    <header className="pit-rim sticky top-0 z-20">
      <div className="flex h-11 items-stretch">
        <MenuButton />
        <Link
          to="/"
          className="flex items-center px-2 font-display text-base leading-none tracking-[0.18em] text-fg sm:px-3"
        >
          PIT
          <span className="pit-cursor ml-1" aria-hidden />
        </Link>
        <Tape />
        <div className="flex items-center pr-2 sm:pr-3">
          <AccountChip sessionUser={sessionUser} />
        </div>
      </div>
    </header>
  );
}
