# HBS Suite: separate backend and frontend

The old Next.js app is now two apps:

| | Stack | Folder | Port (dev) |
|---|---|---|---|
| **API** | Node.js, Express 5, MySQL (mysql2), Redis (ioredis), BullMQ | `backend/` | 4000 |
| **Worker** | BullMQ consumers + repeatable jobs (replaces `scheduler.js` + `mailWorker.js`) | `backend/src/workers` | – |
| **Web** | React 19 + Vite 7 + React Router 7 + Tailwind 4 | `frontend/` | 5173 |

## Why it's faster now

- **Screens load as small JS chunks, not server-rendered pages.** Each screen is lazy-loaded and fetches only its own data from `/api/views/*`.
- **Every list is paginated on the server** (`?page=&limit=`, max 100 rows). The response looks like `{ items, total, page, limit, pages }`. Search and filters run in SQL, not in the browser. This covers clients, GMB profiles, keywords, the task queue, AI runs, listing health, billing invoices and ledger, and on the admin side tenants, users, subscriptions, invoices, audit, usage and credit wallets. Admin GMB posts and profiles were already paginated.
- **Per-row `COUNT(*)` subqueries now run only for the visible page.** Before, they ran for every client or tenant on every load.
- **Redis caches the heavy aggregates** (dashboard, analytics, admin overview and usage) for 30 seconds per tenant (`VIEW_STATS_TTL`).
- **A new migration adds 14 composite indexes** for the tenant-scoped list queries: `db/migrations/v12-split-performance-indexes.sql`.
- **A slow AI run no longer delays mail or publishing.** Background work runs in BullMQ queues: `ai`, `publishing`, `mail` and `maintenance`.
- **The API runs in PM2 cluster mode.** Rate limits are global (Redis), sessions are signed cookies and the API holds no state, so you can add instances.

## Backend structure (modular monolith)

```
backend/src
├── server.js                 HTTP entry (graceful shutdown)
├── app.js                    helmet, cors, compression, cookies, Redis rate-limit, raw body, modules
├── config/                   env, redis
├── core/
│   ├── http/adapter.js       Web Request/Response handler <-> Express bridge
│   ├── http/errors.js        uniform JSON errors
│   ├── pagination.js         pageParams(), pagedQuery(), likeAny()
│   ├── cache.js              cached(key, ttl, fn) on Redis (falls through if Redis is down)
│   └── requestContext.js     AsyncLocalStorage per request (cookies/headers/cache)
├── modules/                  one folder per domain, mounted at /api/<module>
│   ├── index.js              module registry
│   ├── auth/  clients/  gmb/  tasks/  billing/  admin/  reviews/  rank/ ...  (30 modules)
│   │   ├── <module>.routes.js
│   │   └── controllers/*.controller.js
│   ├── views/                read endpoints for each React screen (/api/views/*), all paginated
│   └── pwa/                  /sw.js, /manifest.webmanifest
├── lib/                      domain logic (AI pipeline, GMB providers, SaaS billing, storage, mail ...)
├── shims/                    tiny replacements for next/server, next/headers, next/og (satori + resvg)
├── queues/  jobs/  workers/  BullMQ queues, job registry, worker process
└── scripts/ (in backend/)    seed, migrate, check-imports, own-company, postman
```

Controllers keep the original handler contract, `(request, { params }) => Response`. All 152 endpoints therefore behave exactly as before, with the same URLs and the same JSON. Only the server underneath changed.

## Local setup

```bash
# 1. services (or use your XAMPP MySQL + a local Redis)
docker compose up -d

# 2. API + worker
cd backend
cp .env.example .env          # set DB_*, SESSION_SECRET, APP_ENCRYPTION_KEY, REDIS_URL
npm install
npm run db:setup              # schema + demo data (fresh DB only)
npm run db:migrate            # performance indexes (safe to re-run)
npm run dev                   # API  -> http://localhost:4000
npm run worker:dev            # jobs (second terminal)

# 3. React app
cd ../frontend
npm install
npm run dev                   # -> http://localhost:5173  (proxies /api to :4000)
```

Demo logins come from `db:setup`: `superadmin@gmbai.cloud / super123` and `owner@hovermedia.in / owner123`. Login uses an email OTP. If SMTP isn't set, the code is printed in the worker log.

Existing database: skip `db:setup` and run only `npm run db:migrate`.

## Background jobs

```bash
npm run job -- list                 # every job, queue and schedule
npm run job -- ai.nightly           # run once now (inline)
npm run job -- ai.nightly --queue   # hand it to the worker
```

| Job | Queue | Default schedule |
|---|---|---|
| ai.nightly | ai | `NIGHTLY_CRON` 00:00 |
| publishing.calendar | publishing | every 2 min |
| publishing.auto | publishing | every 5 min |
| mail.drain | mail | every 10 s |
| maintenance.billing / housekeeping / image-cleanup / health / review-sync / listing-health / heartbeat / hydrate-integrations | maintenance | as before |

To switch any job off, add it to `DISABLED_JOBS=` (comma separated).

## Production (Hostinger VPS: Ubuntu, Nginx, PM2)

```bash
# backend
cd /var/www/hbs-suite/backend && npm ci --omit=dev && npm run db:migrate
pm2 start ecosystem.config.cjs && pm2 save        # hbs-api (cluster) + hbs-worker

# frontend
cd /var/www/hbs-suite/frontend && npm ci && npm run build   # -> dist/

# nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hbssuite.com
sudo ln -s /etc/nginx/sites-available/hbssuite.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Keep **one domain**. Nginx serves `frontend/dist` and proxies `/api`, `/sw.js` and `/manifest.webmanifest` to the API. The cookie, the Google and Meta OAuth redirect URIs and the Razorpay/Pub/Sub webhooks then keep their old URLs. Set `APP_URL=https://hbssuite.com` and `CORS_ORIGINS=https://hbssuite.com` in `backend/.env`.

Remove the old PM2 apps `hbs-web`, `hbs-scheduler` and `hbs-mail` (`pm2 delete hbs-web hbs-scheduler hbs-mail`). `hbs-worker` replaces both background processes.

## Team access (assigned clients)

- The owner, and anyone the owner ticks **"See ALL clients"** for (Team → Permissions), sees every client.
- Every other team member sees **only the clients assigned to them**. This covers the client list, client and GMB pages, every `/api/gmb/:id/*` action, posts and the task queue, calendar, keywords, AI runs, review inbox, listing health, rank tracker, reports, search and dashboard numbers. The rule sits in `lib/saas/clientScope.js`. Repo functions apply it from the request context, so new screens get it automatically.
- To assign clients: on **Clients**, tick rows, choose **Assign to team member** and click **Apply**. You can also pick the owner in the client form. A client a member adds is assigned to that member.

## Duplicate clients

- Google connects are now all-or-nothing. If a step fails, any client row created during that attempt is deleted again. An unlinked client with the same name and city is re-used instead of creating a copy. A unique index on `(tenant_id, google_location_name)` stops double-click and parallel duplicates.
- To clean existing duplicates, use **Clients → Find duplicates** (owner) or run `npm run fix:duplicates` (dry run), then `npm run fix:duplicates -- --apply`. Only empty copies are removed: not linked, no posts, tasks or calendar slots. Then run `npm run db:migrate` to add the unique index.

## API conventions

- Paginated list: `GET /api/views/clients?page=2&limit=25&q=dental&status=active` returns `{ ok, clients: { items, total, page, limit, pages }, ... }`
- Errors: `{ ok: false, error, code, meta }`. The SPA handles `401 UNAUTHENTICATED` by going to `/login?next=`, `409 NO_TENANT` by going to `/admin`, and `403 PAGE_DENIED` by going to `/dashboard?denied=`.
- `GET /api/clients` (the public JSON list) is now paginated as well. It defaults to 50 rows, max 100, and still returns `clients` for compatibility.

## Frontend notes

- `src/pages/*` holds the screens (lazy routes in `src/App.jsx`). `src/layouts/*` holds the shells. `src/components/*` holds the existing UI.
- `src/hooks/use-page-data.js` loads screen data and reloads it on `router.refresh()`. `use-list-params.js` keeps filters and the page in the URL. `components/pagination.jsx` is the shared pager.
- Components written for Next.js still import `next/link` and `next/navigation`. Vite aliases these to small shims in `src/shims/`, so no Next.js code ships.
- `npm run lint` checks for undefined references and hook rules.
