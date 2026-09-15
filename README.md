# PIXELPIT

Mindshare board for `$PIT`. Connect X, post `$PIT` or tag [@pixellPIT](https://x.com/pixellPIT), and we pull the post and rank it.

## After you connect

You land on your **hunter board**: mindshare, rank, posts, streak. Tabs are Leaderboard, Feed, and Post.

## Deploy env

Set these on Vercel:

| Name                | Why                                              |
| ------------------- | ------------------------------------------------ |
| `DATABASE_URL`      | Neon Postgres                                    |
| `VITE_PRIVY_APP_ID` | Privy app id — login. Public; safe in the bundle |
| `X_API_KEY`         | X API Key — reading public posts                 |
| `X_API_SECRET`      | X API Secret — reading public posts              |

Vercel bakes environment variables into a deployment at build time, so editing
one does nothing until you **redeploy**.

## Login

Login is [Privy](https://dashboard.privy.io). Privy brokers X sign-in with its
own registered X app, so there is no X developer-portal callback tied to this
domain — which is what kept breaking when the app talked to X directly, and what
breaks again every time the domain moves.

To set it up:

1. Create an app at [dashboard.privy.io](https://dashboard.privy.io).
2. **Login methods → Socials → X**, enabled with Privy's default credentials.
   (You _can_ supply your own X OAuth app here instead, but then you own the
   callback-URL problem again.)
3. **Login methods → Wallets** on, so a hunter can link a wallet instead of
   pasting an address.
4. Copy the App ID into `VITE_PRIVY_APP_ID` on Vercel, then redeploy.

The app id is exactly 25 characters. `PrivyProvider` throws on anything else
_during SSR_, which would return 500 on every page — so a malformed id is
rejected before the provider sees it and login simply reports itself as
unconfigured, with the reason logged.

### How a request is authorized

The browser holds the session and Privy issues a short-lived access token (a JWT
signed ES256). `authMiddleware` forwards it on every server function call, and
the server verifies it locally against the app's public JWKS — issuer
`privy.io`, audience pinned to the app id, so a token minted for a different
Privy app cannot be replayed here. The verified `sub` claim (a `did:privy:…`
DID) is the user id every query is scoped by.

The X API keys above are unrelated to login: they mint an app-only bearer for
reading public posts.
