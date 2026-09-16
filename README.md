# Makkal Mobile Hub

React + TypeScript storefront with API handlers running in the same Vinext application. Local development uses Cloudflare D1 (SQLite) and R2 emulation. MongoDB and a separate backend server are not required.

## Run locally (Windows PowerShell)

Install Node.js 22.13 or later and Git. From this repository's root:

```powershell
corepack pnpm install --frozen-lockfile
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_conscious_shinko_yamashiro.sql
npm run dev
```

Run the database initialization command **once for a new local database**, not on every start. After that, use only `npm run dev`. Open the URL printed by the server (normally http://localhost:5173). The frontend and backend share this address; `/api/store` and `/api/upload` are backend endpoints. Stop the server with Ctrl+C.

The first build generates the local database binding configuration. Keep `.wrangler/state` to preserve local products, carts, orders and photos. Local data is separate from the live store; it starts empty. No Cloudflare login or production database credentials are needed for local development.

This repository uses the pinned pnpm version from `package.json`; do not use `npm install` or the Linux-only `install:ci` script on Windows. If Corepack reports an unwritable cache, select a project-local cache first:

```powershell
$env:COREPACK_HOME = Join-Path (Get-Location) '.sites-runtime/corepack'
```

## Local login and admin access

Browse without signing in to test guests. **Your account → Sign in with ChatGPT** uses the starter's local-only mock customer (`seedy@sites.test`) on localhost. It does not perform real ChatGPT login and does not grant store administration. The live site's authentication is supplied by Sites.

The existing server policy in `lib/store-server.ts` identifies the store owner by comparing the authenticated account email with the private OWNER_EMAIL setting. A missing setting grants nobody admin access. There is no role column in this version. `/api/store` returns that policy's `admin` boolean, and the UI requires an authenticated user plus `admin === true` after account loading completes. Editable profile details cannot grant access. Do not change the production policy to make every local user an admin.

To test Store Admin locally, put `OWNER_EMAIL=seedy@sites.test` in an ignored `.dev.vars` file in the project root, restart the development server, and use the local sign-in. Remove that setting and restart to test a normal signed-in customer. This configures only the existing local mock account; production must use the real owner email. Never commit `.dev.vars`. Automated tests below also cover the owner identity in isolation, without changing live authentication or live data.

## Tests

```powershell
node node_modules/typescript/bin/tsc --noEmit
node tests/store-integrity.mjs
```

The browser regression test requires Playwright and its Chromium browser. If Playwright is installed separately, set `PLAYWRIGHT_MODULE` to its package directory. Optionally set `BROWSER_CHANNEL=msedge` or `chrome` to use an installed browser.

```powershell
node tests/storefront-access.mjs
```

The backend tests execute the real handlers against in-memory SQLite and simulated authenticated users. Browser tests mount the real storefront and UI components with fixture API responses. They cover guests, customers, owners, direct admin navigation, pending/failed account loads, revoked access, and basket behavior. These do not test live ChatGPT authentication.

## Important files

- `app/storefront.tsx`: customer interface and guarded admin interface
- `app/api/store/route.ts`: catalogue, profile, cart, order and admin APIs
- `app/api/upload/route.ts`: owner-protected product uploads
- `app/chatgpt-auth.ts`: platform-authenticated identity
- `lib/store-server.ts`: existing owner policy and database helpers
- `db/schema.ts`, `drizzle/`: database schema and migrations
- `OPERATIONS.md`: store setup and daily operations

For a local production preview, run `npm run build` and then `npm start`. Use its printed URL. This mode does not simulate sign-in. Hosting is currently managed by ChatGPT Sites; pushing to GitHub alone does not deploy the website.

