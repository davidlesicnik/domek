# Domek

Domek is a container-first household planner for shared household coordination.

## Features

- **Dashboard** — home board with feature navigation
- **Household management** — invite members by email, assign roles (owner/member), set member colors, transfer ownership, leave or delete a household
- **Calendar** — shared household calendar with per-event member assignment
- **To-do lists** — shared task lists with item completion tracking
- **Shopping lists** — shared shopping lists with item check-off
- **Notes** — shared freeform notes
- **Expenses** — basic expense tracker with categories
- **Authentication** — Supabase OAuth (Google and GitHub)
- **Email invites** — invite links sent via Resend

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS for responsive styling
- Supabase Auth with OAuth providers
- Prisma with PostgreSQL
- Docker Compose for local and container deployment
- Resend for transactional email

## Local Development

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

Configure a Supabase project and enable the Google and GitHub providers before using sign-in. Add the local callback URL (`http://localhost:3000/auth/callback`) and deployed callback URL to the Supabase redirect allow list.

For local `npm run dev`, `DATABASE_URL` points at Postgres on `localhost:5432`. The Docker web service uses `CONTAINER_DATABASE_URL` so it can reach the same database through the Compose-internal `postgres` hostname.

## Environment

Required for local development (see `.env.example`):

```bash
DATABASE_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
CONTAINER_DATABASE_URL="postgresql://domek:domek@postgres:5432/domek?schema=public"
POSTGRES_DB="domek"
POSTGRES_USER="domek"
POSTGRES_PASSWORD="domek"
POSTGRES_PORT="5432"
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
NEXT_PUBLIC_GA_MEASUREMENT_ID=""
RESEND_API_KEY=""
FROM_EMAIL="Domek <noreply@yourdomain.com>"
```

`APP_URL` is optional locally (defaults to `http://localhost:3000`) but required in production so invite links resolve to the correct origin.

`NEXT_PUBLIC_GA_MEASUREMENT_ID` is optional. When set, Domek loads Google Analytics in the browser for aggregate page views and product events. Do not send household names, member details, invite tokens, note text, list item text, expense amounts, or other user-entered household content to analytics.

Validate deployment configuration with:

```bash
npm run env:check
```

Do not commit `.env` files or paste server secrets into public tools, tickets, or chat logs. `SUPABASE_ANON_KEY` / Supabase publishable keys are designed to be browser-visible, but `RESEND_API_KEY`, Supabase service-role keys, and database passwords are server secrets. Rotate any server secret that has been exposed.

## Railway Deployment

Domek is deployed on Railway from the GitHub repository. Railway hosts the containerized Next.js app, while Supabase provides Postgres and Auth.

This repo has a `Dockerfile`, so Railway should deploy it as a Docker-backed service. The production image uses Next.js standalone output and starts with:

```bash
node server.js
```

Use these Railway service settings:

```bash
PORT=3000
HOSTNAME=0.0.0.0
```

Set the public Railway domain target port to:

```text
3000
```

If Railway injects or suggests `PORT=8080`, the app may start on `8080` while the Dockerfile/domain routing still expects `3000`, causing 502 responses. Keep `PORT`, `HOSTNAME`, and the domain target port aligned.

Railway variables should be raw values, not quoted `.env` syntax. Use `PORT=3000`, not `PORT="3000"`.

Recommended Railway variables:

```bash
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5"
DIRECT_URL="postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_or_anon_key"
RESEND_API_KEY="re_your_server_secret"
FROM_EMAIL="Domek <noreply@yourdomain.com>"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
APP_URL="https://your-service.up.railway.app"
```

`connection_limit=1` is very conservative and can bottleneck traffic. Start around `5` per app instance, then tune based on replica count and Supabase connection budget.

Do not use the local database URL in Railway:

```bash
DATABASE_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
```

Inside a Railway container, `localhost` means the app container itself, not Supabase and not a separate Postgres service.

Local Docker/Compose-only variables are not needed in Railway when Supabase hosts Postgres:

```bash
CONTAINER_DATABASE_URL
POSTGRES_DB
POSTGRES_PASSWORD
POSTGRES_PORT
POSTGRES_USER
```

### Railway Migration Command (Production)

Use a Railway **Pre-deploy Command** so migrations run before the app process starts:

```bash
npm run db:deploy:verify
```

This command runs a production-safe verification pipeline in order (apply migrations, verify migration status, then run a lightweight database healthcheck):

```bash
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:healthcheck
```

`DIRECT_URL` is required for migration deploys. If it is missing/invalid, deploy verification now fails fast before migration starts.

If pre-deploy appears stuck on migrations, set `MIGRATION_DEPLOY_TIMEOUT_MS` (default `300000`) to enforce a hard timeout and get lock/reachability troubleshooting output. The verifier sends `SIGTERM` and escalates to `SIGKILL` after 5 seconds so hanging migration processes do not block deploy forever.

Keep the Railway start command app-only (`node server.js`). Do not run `prisma migrate dev` or `prisma db push` in production. The Docker runtime image includes the Prisma CLI and deploy scripts so this pre-deploy command works in containerized Railway deployments.

### Railway 502 Checklist

If the Railway app shows 502s:

- Confirm the service is using the Dockerfile and the start command is `node server.js`, or leave the start command blank so Docker's `CMD` is used.
- Confirm `PORT=3000`.
- Confirm `HOSTNAME=0.0.0.0`.
- Confirm the Railway public domain target port is `3000`.
- Check logs for the Next.js startup line and verify it reports port `3000`.
- Confirm `DATABASE_URL` points to Supabase Postgres, not `localhost`.
- URL-encode special characters in the database password, especially `@`, `#`, `%`, `/`, `:`, `?`, and `&`.

## Billing and Access

Domek now uses a Paddle-first onboarding flow.

1. A user logs in.
2. If they do not already belong to a household, or if their household subscription is unpaid, paused, or canceled, Domek sends them to `/onboarding/payment`.
3. Paddle Checkout starts the yearly household subscription with a 30-day trial.
4. Paddle sends subscription lifecycle webhooks to `/api/paddle/webhook`.
5. Domek stores the subscription status in `BillingSubscription`.
6. Once the status is `TRIALING` or `ACTIVE`, the user can continue to `/onboarding/household` and create the household.

Household creation is now blocked until billing access exists, unless the user has development access.

**Billing-backed access states:**

| State | Effect |
|---|---|
| `TRIALING` | User can create a household and access the app |
| `ACTIVE` | User can create a household and access the app |
| `PAST_DUE`, `PAUSED`, `CANCELED` | User is redirected back to `/onboarding/payment` |

### Paddle Environment Variables

Domek expects four Paddle values:

- `PADDLE_CLIENT_TOKEN`
- `PADDLE_PRICE_ID`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_API_KEY`

Keep all four in the same Paddle environment:

- sandbox for local testing
- live for production

Do not mix a sandbox client token with a live price, webhook secret, or API key.

### How To Get The Paddle Variables

#### `PADDLE_CLIENT_TOKEN`

Used by the browser checkout loader in `src/components/billing/paddle-checkout-launcher.tsx`.

Where to get it in Paddle:

- `Developer tools -> Authentication -> Client-side tokens`

Create a client-side token and copy the token value.

Expected format:

- sandbox: starts with `test_`
- live: starts with `live_`

#### `PADDLE_PRICE_ID`

Used by checkout to open the yearly subscription plan.

Where to get it in Paddle:

- `Catalog -> Products`
- open the Domek product
- create or open the recurring yearly price
- copy the price ID

Expected format:

- starts with `pri_`

Recommended setup for Domek:

- recurring yearly billing
- 30-day trial
- one household plan

#### `PADDLE_WEBHOOK_SECRET`

Used to verify signed webhook requests in `src/app/api/paddle/webhook/route.ts`.

Where to get it in Paddle:

- `Developer tools -> Notifications`
- create or open a notification destination
- copy the destination endpoint secret key

Expected format:

- starts with `pdl_ntfset_`

Webhook destination URL:

- local/ngrok example:
  `https://YOUR-NGROK-DOMAIN/api/paddle/webhook`
- production example:
  `https://YOUR-PRODUCTION-DOMAIN/api/paddle/webhook`

Minimum events Domek should receive:

- `subscription.created`
- `subscription.updated`

Recommended events for the current integration:

- `subscription.created`
- `subscription.updated`
- `subscription.trialing`
- `subscription.activated`
- `subscription.canceled`
- `subscription.past_due`
- `subscription.paused`
- `subscription.resumed`

#### `PADDLE_API_KEY`

Used server-side for billing actions in account settings, such as:

- cancel subscription immediately when deleting an account
- cancel subscription at the end of the billing cycle from account settings

Where to get it in Paddle:

- `Developer tools -> Authentication -> API keys`

Create a server-side API key and copy the value.

Expected format:

- starts with `pdl_`
- newer sandbox keys commonly include `_sdbx`

Minimum permission:

- `Subscriptions (Write)`

Recommended permissions:

- `Subscriptions (Write)`
- `Subscriptions (Read)`

### Local Sandbox Setup

For local testing with ngrok:

1. Start the app on port `3000`.
2. Start ngrok:

```bash
ngrok http 3000
```

3. Set `APP_URL` to the exact HTTPS forwarding URL from ngrok.
4. In Supabase Auth URL configuration, allow your ngrok callback host. Wildcards are supported, for example:

```text
https://*.ngrok-free.dev/auth/callback
https://*.ngrok-free.app/auth/callback
```

5. In Paddle sandbox, set the notification destination to:

```text
https://YOUR-NGROK-DOMAIN/api/paddle/webhook
```

6. Use sandbox versions of:

- `PADDLE_CLIENT_TOKEN`
- `PADDLE_PRICE_ID`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_API_KEY`

If your ngrok URL changes, update:

- `APP_URL`
- the Paddle notification destination URL
- any Supabase redirect URL entries that are not covered by your wildcard pattern

### Example

```bash
APP_URL="https://your-ngrok-domain.ngrok-free.dev"
PADDLE_CLIENT_TOKEN="test_..."
PADDLE_PRICE_ID="pri_..."
PADDLE_WEBHOOK_SECRET="pdl_ntfset_..."
PADDLE_API_KEY="pdl_sdbx_..."
```

**Development access code** (entered on the payment onboarding screen):

- `domekappdevelopment` — grants permanent dev access (`User.developmentAccessGrantedAt`) and bypasses Paddle entirely

## Database

Generate the Prisma client:

```bash
npm run db:generate
```

Create and apply a development migration after the database is reachable:

```bash
npm run db:migrate
```

The schema includes users, households, household membership, and feature-specific tables for calendar events, to-do lists, notes, shopping lists, and expenses. Supabase Auth owns identity; Prisma keeps a slim `User` row keyed by the Supabase auth UUID for application foreign keys.

### Database Backups

For production on Supabase without PITR, use [`scripts/backup-db.sh`](scripts/backup-db.sh) inside the dedicated backup container defined by [`Dockerfile.backup`](Dockerfile.backup) and [`docker-compose.backup.yaml`](docker-compose.backup.yaml). The script:

- pulls a live `pg_dump` from a Supabase connection on port `5432`
- compresses the dump with `zstd` or `gzip`
- snapshots the latest successful dump directory into a `restic` repository
- prunes snapshots with `--keep-last 96 --keep-daily 35`
- keeps a local copy of the latest successful artifact in `BACKUP_DEST_DIR/latest`

The backup image is based on `postgres:17-bookworm` so `pg_dump` stays aligned with the Postgres 17 server family used by this project and supported by Supabase. It installs a pinned upstream `restic 0.18.1` release binary with SHA256 verification during the image build.

Use one of these Supabase connection types for `BACKUP_DATABASE_URL`:

- direct connection on `:5432` if the backup runner has IPv6
- Supavisor session pooler on `:5432` if the backup runner is IPv4-only

Do not use the transaction pooler on `:6543` for this backup job.

Create a runner-specific config from [`scripts/backup-db.env.example`](scripts/backup-db.env.example) and keep it off-repo. The minimum required settings are:

```bash
BACKUP_DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-YOUR-REGION.pooler.supabase.com:5432/postgres"
BACKUP_DEST_DIR="/backup"
BACKUP_DESTINATION_SENTINEL="/backup/.domek-backup-target"
RESTIC_REPOSITORY="/backup/restic"
RESTIC_PASSWORD_FILE="/etc/domek/restic-password"
ALLOW_RESTIC_INIT="false"
```

Leave `ALLOW_RESTIC_INIT` as `false` for normal runs. Set it to `true` only for the very first run when you intentionally want the script to create a brand-new restic repository.
Create the sentinel file on the mounted NAS path before the first run, for example `touch /mnt/nas/domek-backups/.domek-backup-target`. The script refuses to write backups if that file is missing so it does not silently write to the host filesystem when the NAS mount is absent.

Create a small host-side compose env file from [`scripts/backup-compose.env.example`](scripts/backup-compose.env.example) and keep it off-repo. It tells Compose where the runtime env file lives and which NAS directory to mount:

```bash
BACKUP_ENV_FILE=/etc/domek/backup-db.env
BACKUP_DESTINATION_DIR=/mnt/nas/domek-backups
RESTIC_PASSWORD_FILE_PATH=/etc/domek/restic-password
```

The backup image defaults to the non-root `postgres` user, but [`docker-compose.backup.yaml`](docker-compose.backup.yaml) runs the one-shot backup job as `root` (`user: "0:0"`). This is intentional for NAS environments like Synology where bind-mounted shares often deny access to non-root container users.

First run or after changing the backup image:

```bash
docker compose \
  --env-file /etc/domek/backup-compose.env \
  -f docker-compose.backup.yaml \
  run --rm --build db-backup
```

Recurring run after the image has already been built:

```bash
docker compose \
  --env-file /etc/domek/backup-compose.env \
  -f docker-compose.backup.yaml \
  run --rm db-backup
```

Example `cron` entry for every 30 minutes:

```cron
*/30 * * * * cd /path/to/domek && docker compose --env-file /etc/domek/backup-compose.env -f docker-compose.backup.yaml run --rm db-backup >> /var/log/domek-backup.log 2>&1
```

Restore flow:

```bash
restic restore latest --target /tmp/domek-restore
find /tmp/domek-restore -name 'domek-prod-*.dump.zst' -o -name 'domek-prod-*.dump.gz'
```

If you use the default `zstd` compression, decompress before running `pg_restore`:

```bash
zstd -d /tmp/domek-restore/path/to/domek-prod-YYYYMMDDTHHMMSSZ.dump.zst -o /tmp/domek-prod.dump
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$RESTORE_DATABASE_URL" /tmp/domek-prod.dump
```

The backup script is designed for live operation. `pg_dump` takes a consistent snapshot, so you do not need to stop the app or turn off the database first.

## Containers

Validate the Compose file:

```bash
docker compose config
```

Build the production image:

```bash
docker compose build
```

Run the app and Postgres:

```bash
docker compose up
```

The web image is built with a multi-stage Dockerfile and runs as a non-root user in the final stage.

## Internationalization

Domek supports English (`en`) and Slovenian (`sl`). The active locale is embedded in the URL path:

- `/en/...` — English
- `/sl/...` — Slovenian

Visiting `/` redirects to `/en/` by default.

Translation files live at `messages/en.json` and `messages/sl.json`, organized by feature namespace. The library is **next-intl** (`src/i18n/`).

To add a new language:

1. Add the locale code to `src/i18n/routing.ts` (`locales` array).
2. Create `messages/<locale>.json` with all keys from `messages/en.json`.
3. Add the same locale to `generateStaticParams` in `src/app/[locale]/layout.tsx` (already covered by the `routing.locales` map).

Legal pages (`/privacy`, `/terms`, `/refund-policy`, `/cookies`) are English-only and do not require translation.

## Quality And Security

- Keep strict TypeScript enabled.
- Keep secrets out of Git; commit only `.env.example`.
- Add database constraints and indexes with the data model, not as a cleanup step later.
- Keep route-level auth checks server-side for protected areas.
- Prefer small, typed modules over large route files.
- Run `npm run lint`, `npm run build`, `docker compose config`, and `docker compose build` before handing off changes.
