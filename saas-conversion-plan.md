# Self-Serve SaaS Conversion Plan — CooperDale

**App today:** Member/event/attendance management (Members, Events, Attendance, Followups, Messages, Users)
**Backend:** Express 5 + Sequelize 6 + MySQL (mysql2) on port 5050, JWT auth (homegrown), bcryptjs, SSL via PEMs in `api/config/` (looks like managed MySQL — Cloud SQL / Azure MySQL / RDS with custom CA)
**Frontend:** Vite + React 19 + Tailwind 4 (separate `client/` SPA, talks to the API via `client/src/api/*.js`)
**Today's provisioning:** Hand-spin a new instance, hand-create a MySQL database, run Sequelize migrations, bootstrap an admin
**Goal:** Customer hits a marketing page → signs up → pays via Stripe → fully provisioned tenant in under a minute, no human in the loop

---

## 1. The shift in plain terms

You're going from "one app + one database per customer, set up by hand" to a SaaS where signup, payment, provisioning, and routing are automated. There are three new jobs that don't exist in your code yet:

1. **A public front-of-house** — marketing/pricing/signup pages that are *not* gated behind login and don't belong to any tenant.
2. **A control plane** — owns accounts, subscriptions, and the directory of tenants (which DB belongs to which customer). This is *new infrastructure*; your current app doesn't have anything like it.
3. **A tenant-aware runtime** — your existing Express API needs to pick the right MySQL database per request instead of using the one in `config.json`.

Most of the work is in #2 and #3.

---

## 2. Target architecture

### 2.1 Components

- **Marketing site** (`yourapp.com` or `cooperdale.app` etc.) — the only thing on the apex domain. `/`, `/pricing`, `/signup`, `/welcome`. I'd build this as a small **separate** Vite/React or Next.js app, not a route inside the current SPA, because it has different auth/SEO needs.
- **Control plane API** — a new small Express service (could live in the same repo as `api/` under `control/`) with its own MySQL database that holds: accounts, users, tenant directory, subscriptions, provisioning jobs, audit log.
- **Tenant app API** — your existing `api/` code, refactored so that the Sequelize connection used for a given request is determined by the tenant the request belongs to (not a single config).
- **Tenant app frontend** — your existing `client/` SPA, served from `*.yourapp.com` (one subdomain per tenant) or `/t/:slug/*`.
- **Provisioning worker** — a Node worker that, on a successful signup + payment, creates the tenant's MySQL database, runs migrations, seeds the admin user, registers the subdomain, sends the welcome email. Mirrors what `server.js` already does in `ensureDatabaseAndTables` + `ensureBootstrapAdmin` — you'll lift that logic out.
- **Billing** — Stripe Checkout for signup, Customer Portal for self-serve plan changes/cancellation, webhooks into the control plane.
- **Auth** — replace the homegrown JWT with a managed auth provider (Clerk, WorkOS, Auth0, Supabase Auth). Big payoff: invites, password reset, magic links, MFA, SSO-when-you-need-it, all for free.

### 2.2 How a request finds its tenant

Three options:

- **Subdomain** — `acme.yourapp.com`. Best UX. Needs wildcard DNS + wildcard TLS (ACM wildcard on AWS, Google-managed certs, Caddy on a VPS). **Recommended.**
- **Path prefix** — `yourapp.com/t/acme`. Simplest infra; no DNS work. Slightly worse UX. A reasonable v1.
- **Custom domains** — `app.acmecorp.com`. Add later as a paid feature.

Either way, you add an Express middleware (let's call it `resolveTenant`) early in the chain. It:
1. Reads the host header (or the `:slug` path param).
2. Looks up the tenant in the control DB (cache this — Redis or in-process LRU).
3. Attaches `req.tenant = { id, slug, dbName, dbHost, status }`.
4. Attaches `req.sequelize = getSequelizeForTenant(req.tenant)` — see §3.2.
5. If the tenant is `suspended` or `provisioning`, short-circuit with a friendly response.

This middleware sits *before* `authenticateToken`, since the tenant context is needed to load users.

### 2.3 Database-per-tenant on MySQL

Since you chose DB-per-tenant — and your code already does `CREATE DATABASE IF NOT EXISTS` in `server.js` — you're closer than you think. Operational details that matter:

- **Don't spin up a new MySQL instance per tenant.** Use one MySQL instance/cluster and create a **separate database** per tenant inside it (`cooperdale_acme`, `cooperdale_globex`, …). The `quoteDbName` helper in `server.js` is exactly the pattern. Move heavy/enterprise tenants to dedicated instances later only if needed.
- **Connection pooling:** Today `db/pool.js` opens one mysql2 pool with `connectionLimit: 10`. Per-tenant pools will multiply that fast. Two patterns:
  - **Per-tenant Sequelize cache** with small pools (e.g., `pool.max: 3`), keyed by tenant ID, with an LRU eviction so cold tenants release connections.
  - **One pool with dynamic database switching** — a single mysql2 pool with no default DB; each query uses fully-qualified `database.table` references, or runs `USE \`db\`` first. Sequelize doesn't love this pattern; the per-tenant pool cache is cleaner.
  - Put **ProxySQL** (or your cloud's managed proxy) in front of MySQL once you have >50 tenants — it multiplexes app-side connections onto fewer real DB connections.
- **Migrations:** Every Sequelize migration in `api/migrations/` has to run against every tenant DB on deploy. Build a `npm run migrate-all-tenants` script that iterates `tenants` and runs `sequelize-cli db:migrate --env <tenant>` against each. Track the latest migration version per tenant in the control DB so you can detect drift.
- **Backups:** Per-DB `mysqldump` on a schedule into S3/GCS with retention. Keep the platform's full snapshot too.
- **Tenant directory schema (in the control DB):**
  ```
  tenants(id, slug UNIQUE, db_name UNIQUE, db_host, status,
          plan, stripe_customer_id, stripe_subscription_id,
          created_at, suspended_at, deleted_at)
  ```
  Plus `provisioning_jobs(id, tenant_id, status, step, error, ...)`, `accounts(id, email, ...)`, `memberships(account_id, tenant_id, role)`.

---

## 3. What changes in *your* codebase

This is the file-by-file impact. Treat it as a starting map, not a final list.

### 3.1 `api/server.js`

- Pull `ensureDatabaseAndTables` and `ensureBootstrapAdmin` out into reusable functions in a new `api/provisioning/` module. The provisioning worker will call them with a tenant config; the boot path will only initialize the *control* DB.
- The boot path stops creating "the" tenant DB on startup. The control plane connects to its own dedicated DB.
- `PORT = 5050` is fine for one process; for multi-tenant you'll likely run the API behind a load balancer / reverse proxy on 80/443.
- Swap the `'dev_only_change_this_secret'` JWT default for an env var that fails fast if missing (and ideally, retire homegrown JWT for the auth provider — see §5).
- Add the `resolveTenant` middleware before any of the `/api/*` routers (except `/api/auth` and the new `/api/control/*`).

### 3.2 `api/db/pool.js` and `api/models/index.js`

- Today both build a single connection from a single config. You need a **factory**:
  ```js
  // api/db/sequelizeFactory.js (sketch)
  const cache = new Map(); // key: tenantId
  function getSequelizeForTenant(tenant) {
    if (cache.has(tenant.id)) return cache.get(tenant.id);
    const seq = new Sequelize(tenant.db_name, dbUser, dbPass, {
      host: tenant.db_host,
      dialect: 'mysql',
      pool: { max: 3, min: 0, idle: 10_000 },
      dialectOptions: { ssl: sharedSslOptions },
    });
    // attach all models to seq here (factor model files to take a sequelize arg)
    cache.set(tenant.id, attachModels(seq));
    return cache.get(tenant.id);
  }
  ```
- All routes change from `const { Member } = require('../models')` to `const { Member } = req.sequelize.models`. This is the biggest mechanical refactor; touches every route file in `api/routes/`.
- Add an LRU eviction so idle tenants get evicted from the cache (close their pool).

### 3.3 `api/models/*.js`

- Most Sequelize model files already export a function `(sequelize, DataTypes) => Model`, so they're already factory-shaped. `models/index.js` needs to be replaced (or kept just for the control DB) — the per-tenant Sequelize will re-register all the models against a different connection.

### 3.4 `api/routes/*.js`

- Replace top-level model requires with `req.sequelize.models.X`.
- `routes/auth.js` is the trickiest: today login is per-instance (one `users` table). After multi-tenant, login happens *against the control plane*, then the user picks (or is routed to) their tenant. Plan to mostly rewrite this file.

### 3.5 `api/middleware/auth.js`

- `authenticateToken` keeps working but should verify tokens issued by the new auth provider (or your control-plane signer).
- `requirePermission` loads `User` from "the" DB; needs `req.sequelize.models.User`.
- Add a `requireTenantMember(role?)` middleware that checks the JWT's account ID has a membership row in the control DB for `req.tenant.id`.

### 3.6 `api/migrations/`

- Migrations stay; the *runner* changes. You'll loop tenants and migrate each. Add a separate migrations folder for the control DB schema.

### 3.7 `client/`

- Add a tiny "tenant context" wrapper in `client/src/api/http.js` so every fetch sends the tenant slug (host header is enough if you go subdomain).
- Add a top-level "you've been signed out / your account is suspended" handler since these now have new states.
- The marketing site / signup flow should **not** live in this SPA. It's better as a separate Vite or Next.js project at the apex domain so SEO and bundle size don't fight your app.

### 3.8 `api/config/config.json` + PEMs

- The cert files (`client-cert`, `client-key`, `server-ca`) are credentials that authenticate to your MySQL host. Keep them out of the repo (move to a secret manager — AWS Secrets Manager, GCP Secret Manager, Azure Key Vault). Same for the JWT secret and any Stripe keys.
- Replace the `config.json` per-env block with one source of truth: control DB connection from env vars; tenant DB connections constructed from the `tenants` row at request time.

### 3.9 New things to add

- `api/control/` — control plane router: `/api/control/signup`, `/api/control/webhooks/stripe`, `/api/control/me`, `/api/control/tenants`, etc.
- `api/provisioning/` — pure functions: `createTenantDb`, `runMigrations`, `seedAdmin`, `registerSubdomain`, plus an orchestration job.
- `api/queue/` — BullMQ + Redis (or your cloud's managed queue) for provisioning jobs.
- `marketing/` — separate small frontend project for the public site.

---

## 4. Signup → provisioned flow

The happy path you're building toward:

1. User clicks **Sign Up** on the marketing site, picks a plan, enters email + desired tenant slug → hits Stripe Checkout (or embedded Stripe Elements).
2. Stripe takes payment. Redirects to `/welcome` ("Setting up your workspace…").
3. Stripe fires `checkout.session.completed` → control plane.
4. Control plane creates the `tenants` row (`status: provisioning`), enqueues a job.
5. Provisioning worker:
   - `CREATE DATABASE cooperdale_<slug>` (reuse `quoteDbName` from `server.js`)
   - Run all Sequelize migrations against the new DB
   - Seed: create the first admin user (lifted from `ensureBootstrapAdmin`)
   - Call DNS API to add `<slug>.yourapp.com` (skip if path-prefix)
   - Send a magic-link login email
   - Flip `status: active`
6. `/welcome` polls (or websocket) until status is `active`, then redirects to `<slug>.yourapp.com`. Total: ideally <60s.

**Make the worker idempotent.** Each step records its own status. Re-running the job is safe. On hard failure: alert (Slack/email), refund automatically via Stripe API, mark tenant `failed`.

---

## 5. Auth — retire the homegrown JWT

Right now `middleware/auth.js` signs its own JWTs with `'dev_only_change_this_secret'` as a fallback (find/replace this immediately, regardless of the SaaS rewrite). For multi-tenant you'll want:

- **Identity in one place** — Clerk, WorkOS, Auth0, or Supabase Auth. Owns email/password, magic links, password reset, MFA, eventually SSO/SAML.
- **Account ↔ tenant ↔ role** lives in the control DB (`accounts`, `memberships(account_id, tenant_id, role, permissions)`).
- **One account, many tenants** — important for support staff, agencies, and your own team. Don't model it as 1:1.
- **Staff impersonation** — gated by an internal-staff role, fully audit-logged. You will use this constantly for support.

Keep the existing `permissions` JSON pattern from `users.js` model — it's a reasonable in-tenant role model. Just move "is this email a real person who's logged in?" to the auth provider.

---

## 6. Stripe specifics

- **Products & prices in Stripe**, never hardcoded in code. Reference Price IDs from env config.
- **Stripe Checkout** for v1. Hosted, handles tax (Stripe Tax), 3DS, Apple/Google Pay, SCA. Move to Stripe Elements only when you need a fully embedded UX.
- **Stripe Customer Portal** for self-serve plan changes, card updates, cancellation, invoice history. Saves you from building those screens.
- **Webhooks the control plane must handle:**
  - `checkout.session.completed` → trigger provisioning
  - `customer.subscription.updated` → update plan/status on tenant
  - `customer.subscription.deleted` → mark tenant for suspension
  - `invoice.payment_failed` → start dunning (email day 1, day 3, suspend day 7)
  - `invoice.paid` → clear suspension, log to revenue analytics
- **Stripe Tax** on from day one. Backfilling tax compliance is painful.
- **Trial?** Decide now: free trial without card, free trial with card, or paid only. With-card trials convert better, reduce signups.

---

## 7. Phased rollout

### Phase 0 — Decisions & scaffolding (week 1)
Lock in: subdomain vs path; auth provider; payment flow; plans/prices; cloud (AWS/GCP/Azure). Move secrets out of `api/config/`. Stand up the control DB schema.

### Phase 1 — Tenant-aware refactor (weeks 2-3)
Build `getSequelizeForTenant`, the `resolveTenant` middleware, and refactor `api/routes/*` to use `req.sequelize.models`. Get one hand-created tenant working end-to-end on a subdomain, no public signup yet. This is the meatiest engineering work.

### Phase 2 — Provisioning (week 3-4)
Lift `ensureDatabaseAndTables` + `ensureBootstrapAdmin` into `api/provisioning/`. Wire BullMQ + Redis (or managed queue). Internal endpoint: `POST /api/control/tenants` with `{slug, email, plan}` provisions in <60s. Test failure paths.

### Phase 3 — Stripe + signup UI (weeks 4-5)
Build the marketing site, wire Stripe Checkout, webhook endpoint, `/welcome` polling page. End-to-end test with Stripe test cards.

### Phase 4 — Migrate existing customers (week 6)
Script: for each existing instance, `mysqldump` the DB, restore as a new tenant DB on the shared instance, create the `tenants` row, send users a magic-link "we've upgraded your account" email. Keep old instances warm for 2 weeks. Do one customer at a time.

### Phase 5 — Soft launch (week 7+)
Open signup behind a waitlist. Watch funnel + provisioning metrics. Then open up.

---

## 8. Concrete task checklist

### Decisions to lock first
1. Subdomain vs. path-prefix routing.
2. Auth provider (Clerk / WorkOS / Auth0 / Supabase).
3. Plan structure: tiers, prices, trial policy.
4. Cloud-specific: managed MySQL (RDS / Cloud SQL / Azure DB for MySQL), queue (Redis on Upstash/Elasticache/Memorystore, or SQS/Pub/Sub), DNS (Route 53 / Cloud DNS / Azure DNS), secrets manager.

### Security cleanup (do this regardless of SaaS)
5. Replace `'dev_only_change_this_secret'` JWT default with a hard fail when env var missing.
6. Replace `'ChangeMe123!'` admin bootstrap default the same way.
7. Move `api/config/*.pem` and `config.json` credentials into a secrets manager. Stop committing them.

### Control plane
8. New control MySQL DB, separate from any tenant DB.
9. Tables: `accounts`, `tenants`, `memberships`, `subscriptions`, `provisioning_jobs`, `audit_log`.
10. New `api/control/` router: signup, webhooks, me, tenants admin.
11. Internal admin UI for staff (start with Retool or a tiny `client-admin/` Vite app).

### Tenant-aware refactor
12. Create `api/db/sequelizeFactory.js` with a per-tenant Sequelize cache + small pools.
13. Create `api/middleware/resolveTenant.js` that reads host/slug, looks up tenant, attaches `req.tenant` and `req.sequelize`.
14. Refactor every file in `api/routes/` to use `req.sequelize.models.X`.
15. Update `api/middleware/auth.js` (`requirePermission`) to use `req.sequelize.models.User`.
16. Update `client/src/api/http.js` to send tenant context (or rely on host).
17. Add tenant-scoped logging — include `tenantId` on every `log()`/`logError()` call in `api/utils/logger.js`.

### Database-per-tenant operations
18. Stand up one shared MySQL instance with SSL.
19. Lift `ensureDatabaseAndTables` from `server.js` into `api/provisioning/createTenantDb.js`.
20. Build `npm run migrate-tenant -- --tenant=<slug>` script.
21. Build `npm run migrate-all-tenants` script for deploys; record applied versions per tenant in control DB.
22. Add ProxySQL (or managed MySQL proxy) once tenant count > ~50.
23. Per-tenant `mysqldump` cron → S3/GCS, with retention policy.

### Provisioning worker
24. Pick a queue: BullMQ on Redis (easy Node default), or SQS / Pub/Sub / Service Bus.
25. Implement provisioning job as idempotent steps: `createDb` → `runMigrations` → `seedAdmin` → `registerDns` → `sendWelcomeEmail` → `markActive`. Each step writes status to `provisioning_jobs`.
26. Wire DNS API for subdomain creation (Route 53 / Cloud DNS / Azure DNS).
27. Wildcard TLS cert (ACM wildcard on AWS, Google-managed certs, Caddy on VPS).
28. Failure alerting (Slack/email) + an internal "stuck jobs" dashboard.

### Stripe
29. Create products + prices in Stripe (test mode first).
30. Build `/pricing` and `/signup` on the marketing site; redirect to Stripe Checkout with metadata `{slug, email, plan}`.
31. Build webhook endpoint in the control plane; verify signatures; handle the 5 events from §6.
32. Enable Stripe Customer Portal; add a "Manage billing" link to the tenant app.
33. Enable Stripe Tax.
34. Build dunning logic for `invoice.payment_failed`.

### Auth
35. Pick + integrate a provider (recommend Clerk or WorkOS).
36. Migrate the marketing-site signup and tenant-app login to the provider.
37. Replace homegrown JWT verification in `middleware/auth.js` with the provider's verification.
38. Implement invite flow (existing tenant admin invites teammates).
39. Implement multi-tenant membership.
40. Build staff impersonation with audit logging.

### Marketing surface
41. New `marketing/` Vite or Next.js project for `/`, `/pricing`, `/signup`, `/welcome`, `/login`.
42. Provisioning-status polling on `/welcome` page.
43. Post-signup onboarding inside the tenant app (empty state for Members, etc.).

### Migration of existing customers
44. Inventory: list every current instance with DB host, customer email, last-active date.
45. Script: `mysqldump <old> | mysql <new-shared>.cooperdale_<slug>`; create `tenants` row; send magic-link email.
46. Dry-run on one test customer first; cut over one real customer at a time; keep old instances warm 2 weeks.

### Pre-launch hardening
47. Load test the provisioning path with 50+ concurrent signups.
48. Chaos test: kill the worker mid-provision, verify recovery.
49. Runbooks: failed provisioning, refund a charge, suspend a tenant, hard-delete a tenant (with backup), restore a tenant from backup.
50. Dashboards: signup funnel, MRR, provisioning success rate, per-tenant active users + DB size.

---

## 9. Open questions worth thinking about now

- **Data residency.** Selling in EU? You may need EU-region tenant DBs. Decide before you build.
- **Plan-gating.** Which features are Starter vs Pro vs Enterprise? Build a feature-flag layer, not scattered `if (plan === 'pro')` checks.
- **SSO / SAML.** Enterprise will ask. WorkOS or Clerk's enterprise tier handles this; Auth0 too.
- **Audit log.** B2B buyers ask for one. Add `tenant_audit_log` from day one even if you don't expose it yet.
- **Cancellation = data deletion?** Decide retention policy now (e.g., suspended 30 days, then hard-deleted) and put it in the ToS.
- **Pricing changes.** Use distinct Stripe Price IDs per cohort so you can grandfather existing customers cleanly.

---

## 10. Recommended tooling (Node + MySQL ecosystem)

- **Auth:** Clerk (fastest to ship) or WorkOS (most B2B-ready). Both have Node SDKs.
- **Payments:** Stripe Checkout + Customer Portal + Stripe Tax. The `stripe` npm package.
- **Queue:** BullMQ on managed Redis (Upstash is the easy pick) for v1; SQS / Pub/Sub when you outgrow it.
- **MySQL pooling:** Per-tenant Sequelize cache with small pools; ProxySQL or your cloud's managed MySQL proxy when scale demands.
- **DNS/TLS:** Route 53 + ACM wildcard on AWS; Cloud DNS + Google-managed certs on GCP.
- **Email:** Resend or Postmark for transactional (welcome, magic links, dunning).
- **Error tracking:** Sentry, with `tenant_id` tagged on every event.
- **Secrets:** AWS Secrets Manager / GCP Secret Manager / Azure Key Vault.
- **Internal admin UI:** Retool to start, your own admin SPA when it matters.

---

## 11. Two things to do this week (regardless of the rest of the plan)

These are no-regrets quick wins you can do before any of the big SaaS work:

1. **Fix the JWT and admin password defaults.** `'dev_only_change_this_secret'` and `'ChangeMe123!'` shouldn't have a fallback at all — fail loudly if the env var isn't set. You don't want a forgotten env var in production to silently use the dev secret.
2. **Get the SSL PEMs and DB credentials out of the repo and into a secrets manager.** This unblocks the multi-tenant refactor (provisioning needs credentials at runtime, not at deploy time) and removes a real security risk today.
