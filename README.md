# PIXELPIT

Mindshare board for `$PIT`. Connect X, post `$PIT` or tag [@pixellPIT](https://x.com/pixellPIT), and we pull the post and rank it.

## After you connect

You land on your **hunter board**: mindshare, rank, posts, streak. Tabs are Leaderboard, Feed, and Post.

## Deploy env

Set these on Vercel (server only — never `VITE_`):

| Name | Why |
|---|---|
| `DATABASE_URL` | Neon Postgres |
| `X_CLIENT_ID` | X OAuth 2.0 Client ID — "Connect X" sign-in |
| `X_CLIENT_SECRET` | X OAuth 2.0 Client Secret — "Connect X" sign-in |
| `X_API_KEY` | X API Key — reading public posts |
| `X_API_SECRET` | X API Secret — reading public posts |
| `APP_PUBLIC_HOSTS` | Optional. Extra domains this deployment serves, comma-separated |

### Setting up "Connect X"

Sign-in normally federates through the shared Grok auth broker, which only issues
callbacks for origins it holds a client for. A deployment on its own domain isn't
one of those, so X sign-in has to talk to X directly.

1. In the [X developer portal](https://developer.x.com), open your app →
   **User authentication settings**.
2. App permissions: **Read**. Type of App: **Web App** (a confidential client).
3. Callback URI / Redirect URL — add one per domain you serve, **including the
   `.vercel.app` alias if you test on it**:
   - `https://www.pixelpit.app/api/auth/oauth2/callback/grok-x`
   - `https://pixelpit.app/api/auth/oauth2/callback/grok-x`
   - `https://pixelpitapp.vercel.app/api/auth/oauth2/callback/grok-x`
4. Copy the **OAuth 2.0 Client ID** and **Client Secret** (not the API key/secret)
   into `X_CLIENT_ID` and `X_CLIENT_SECRET` on Vercel, for the Production
   environment, then redeploy.

Scopes requested: `users.read`, `tweet.read`, `offline.access`. X doesn't return an
email without the opt-in `users.email` scope, so each account gets a stable
synthetic address derived from its numeric X id — it's an internal key, never
mailed to.

### Origins

Better Auth has to know the origin the app is actually served on: it becomes the
OAuth `redirect_uri`, and it's the allowlist the sign-in request is checked
against. The app works it out in two ways:

- **Per request** — the origin the request was actually made to is always
  trusted. That's same-origin by definition, so it accepts nothing an attacker
  could reach, and it means a domain nobody remembered to configure still signs
  in.
- **From the environment** — `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_BRANCH_URL`
  and `VERCEL_URL`, pairing a custom domain with its `www.`/apex sibling and
  reconstructing the `<project>.vercel.app` alias (Vercel exposes no env var for
  it). This list is what `redirect_uri` is built from, so a host missing here
  starts OAuth pointed at `localhost` even though sign-in isn't rejected.

Set `APP_PUBLIC_HOSTS` (comma-separated) for anything those miss — in
particular if the project has **Automatically expose System Environment
Variables** turned off, in which case none of the `VERCEL_*` vars exist and it's
the only source. The server logs its resolved host list at boot, and logs an
error naming this when it's on Vercel with nothing to go on.
