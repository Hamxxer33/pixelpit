import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConnectX } from "@/lib/auth/connect";
import { privyEnabled } from "@/lib/auth/privy";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PixelMark } from "@/components/pixel-art";
import { Button } from "@/components/ui/button";
import { XLogo } from "@/components/brand-icons";
import { APP_NAME } from "@/lib/pixelpit";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const connect = useConnectX();

  if (isPending) {
    return (
      <main className="grid min-h-[80dvh] place-items-center px-4">
        <div className="h-40 w-full max-w-sm animate-pulse rounded-xl bg-surface" />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <main className="grid min-h-[80dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <PixelMark className="size-10" />
        <h1 className="mt-4 font-display text-2xl tracking-wide">{APP_NAME}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Connect with X to enter PIXELPIT mindshare, score public posts, and lock a wallet for WL
          or GTD.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {privyEnabled ? (
            <Button block size="lg" onClick={connect}>
              <XLogo />
              Continue with X
            </Button>
          ) : (
            <p className="text-sm text-muted">Sign-in is not configured.</p>
          )}
        </div>
      </div>
    </main>
  );
}
