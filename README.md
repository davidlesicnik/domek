# Domek

Domek is a container-first household planner you can self-host for your own home.

## What it does

- Shared household dashboard
- Calendar, chores, to-dos, shopping lists, notes, and expenses
- Household invites with email when SMTP is configured, or shareable invite links when it is not
- Local email/password auth owned by the app
- Optional web push reminders

## Stack

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Docker Compose

## Quick start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Core environment

Required:

```bash
APP_URL="http://localhost:3000"
AUTH_SECRET="replace-with-a-long-random-secret"
DATABASE_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
CONTAINER_DATABASE_URL="postgresql://domek:domek@postgres:5432/domek?schema=public"
POSTGRES_DB="domek"
POSTGRES_USER="domek"
POSTGRES_PASSWORD="domek"
POSTGRES_PORT="5432"
```

Optional SMTP for invite emails and password reset emails:

```bash
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="Domek <noreply@example.com>"
SMTP_SECURE="false"
```

Optional web push:

```bash
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_MAILTO="mailto:admin@example.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
NOTIFY_SECRET=""
```

Without SMTP:

- sign up and sign in still work
- invites fall back to copyable links
- password reset requires operator help via the scripts below

## Local auth operator scripts

Set a password directly:

```bash
npx tsx scripts/auth-set-password.ts --email user@example.com --password 'new-password'
```

Prepare existing users for local auth migration:

```bash
npx tsx scripts/auth-migrate-existing-users.ts
```

Send password setup links for migrated users when SMTP is configured:

```bash
npx tsx scripts/auth-migrate-existing-users.ts --send-emails
```

## Self-hosting with Docker Compose

```bash
docker compose up -d --build
```

The default Compose stack includes:

- `web`
- `postgres`
- `scheduler` for daily notification delivery

Put Domek behind your reverse proxy and set `APP_URL` to the public origin.

## Database and backups

Prisma commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:healthcheck
```

`DIRECT_URL` is optional. If you use a pooler in production, point `DIRECT_URL` at a direct PostgreSQL connection for migrations.

Backup scripts in `scripts/` and the backup Compose file are intended for plain PostgreSQL self-hosting now. Set `BACKUP_DATABASE_URL` to a direct PostgreSQL connection for your instance.

## Push notifications

Domek supports optional VAPID web push reminders. Generate keys with:

```bash
npx web-push generate-vapid-keys
```

The scheduler container calls:

```bash
POST /api/notify/send
Authorization: Bearer <NOTIFY_SECRET>
```

## QA and Playwright

Set:

```bash
QA_TEST_EMAIL="qa@example.com"
QA_TEST_PASSWORD="replace-with-a-test-password"
```

Then run:

```bash
npm run test:e2e
```

Global setup will create or update the QA user locally, ensure it has a household, then log in through the real password flow.

## Open-source readiness

The repo includes a public-readiness audit at [docs/oss-public-readiness-audit.md](/Users/david/git/domek/docs/oss-public-readiness-audit.md).
