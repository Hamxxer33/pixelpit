import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Landing } from "@/components/landing";
import { PitApp } from "@/components/pit-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { sessionUser } = Route.useRouteContext();
  const { user, isPending } = useCurrentUserState();

  if (user) {
    return <PitApp user={user} />;
  }

  if (isPending && sessionUser) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="font-mono text-[0.68rem] tracking-[0.18em] text-muted uppercase">
          Loading the pit
        </p>
        <div className="mt-4 h-[22rem] animate-pulse rounded-xl bg-surface" />
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  return <Landing />;
}
