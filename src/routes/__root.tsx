import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteHeader } from "@/components/site-header";
import { PitMenu } from "@/components/pit-menu";
import { APP_NAME, SOCIALS } from "@/lib/pixelpit";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${APP_NAME}` },
      {
        name: "description",
        content:
          "PIXELPIT mindshare. Post $PIT or tag the official X, score the public post, climb the board, lock WL or GTD.",
      },
      { name: "theme-color", content: "#08090b" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Pixelify+Sans:wght@500;600&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <PitMenu />
            <div className="flex-1">
              <Outlet />
            </div>
            <footer className="pit-rim">
              <div className="flex h-8 items-center justify-between px-3 font-mono text-xs tracking-[0.16em] text-subtle uppercase">
                <span>PIXELPIT</span>
                <span className="pit-dots hidden sm:block" aria-hidden />
                <a
                  href={SOCIALS.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sage hover:text-fg"
                >
                  @{SOCIALS.xHandle}
                </a>
              </div>
            </footer>
          </div>
          <Toaster
            theme="dark"
            position="bottom-center"
            toastOptions={{ className: "pixelpit-toast" }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
