import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled } from "@/lib/auth/client";
import { connectProvider } from "@/lib/auth/connect";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PixelMark } from "@/components/pixel-art";
import { Button } from "@/components/ui/button";
import { XLogo } from "@/components/brand-icons";
import { APP_NAME } from "@/lib/pixelpit";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();

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

  const xProvider = GROK_PROVIDERS.find((p) => p.providerId === "grok-x");
  const others = GROK_PROVIDERS.filter((p) => p.providerId !== "grok-x");

  return (
    <main className="grid min-h-[80dvh] place-items-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <PixelMark className="size-10" />
        <h1 className="mt-4 font-display text-2xl tracking-wide">{APP_NAME}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Connect with X to enter PIXELPIT mindshare, score public posts, and
          lock a wallet for WL or GTD.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            <>
              {xProvider ? (
                <Button
                  block
                  size="lg"
                  onClick={() => connectProvider(xProvider.providerId)}
                >
                  <XLogo />
                  Continue with X
                </Button>
              ) : null}
              {others.map((provider) => (
                <Button
                  key={provider.providerId}
                  block
                  variant="outline"
                  onClick={() => connectProvider(provider.providerId)}
                >
                  Continue with {provider.label}
                </Button>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
