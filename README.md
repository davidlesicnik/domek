# Domek

Domek is a self-hosted household planner for shared calendars, chores, shopping lists, notes, and expenses.

Use it as a private home board for your household. You run it yourself with Docker Compose and PostgreSQL.

## What Domek does

- Shared home board for the whole household
- Calendar, chores, to-dos, shopping, notes, and expenses in one place
- Email/password accounts owned by the app
- Invite links, with optional email delivery if SMTP is configured
- Optional web push reminders

## Fast setup

The easiest way to run Domek is with Docker Compose.

### What you need

- Docker and Docker Compose
- Git
- A domain or local URL where you want to open Domek

### 1. Get the code

```bash
git clone https://github.com/davidlesicnik/domek.git
cd domek
```

### 2. Copy the environment file

```bash
cp .env.example .env
```

### 3. Edit the important values in `.env`

For the simplest setup, keep the default PostgreSQL values from `.env.example` unchanged.

At minimum, set these:

```bash
APP_URL="https://your-domek-url.example.com"
AUTH_SECRET="replace-with-a-long-random-secret"
NOTIFY_SECRET="replace-with-a-random-secret"
```

Notes:

- `AUTH_SECRET` should be long and random.
- `APP_URL` should be the full public URL you will use to open Domek.
- For local-only use, `APP_URL="http://localhost:3000"` is fine.
- `NOTIFY_SECRET` is used by the built-in reminder scheduler.
- The default PostgreSQL username, password, and database name are fine for most home setups.

If you want to change the PostgreSQL username or password, update all related values together:

```bash
POSTGRES_USER="your-user"
POSTGRES_PASSWORD="your-password"
DATABASE_URL="postgresql://your-user:your-password@localhost:5432/domek?schema=public"
CONTAINER_DATABASE_URL="postgresql://your-user:your-password@postgres:5432/domek?schema=public"
```

### 4. Start Domek

```bash
docker compose up -d --build
```

This starts:

- `web` for the app
- `postgres` for the database
- `scheduler` for daily reminder delivery

### 5. Run the database migration

On first install, create the database tables:

```bash
docker compose exec web npx prisma migrate deploy
```

### 6. Check that everything is running

```bash
docker compose ps
docker compose logs -f web
```

You should see the `web` service running and the app starting without errors.

### 7. Open the app

Visit the URL from `APP_URL`.

If you are only using Domek on your own machine, that is usually:

```text
http://localhost:3000
```

On first run:

- create your account
- create your household
- invite other household members

If sign-up or sign-in fails, check the troubleshooting section below first.

## Optional email setup

Domek works without SMTP.

Without SMTP:

- sign up still works
- sign in still works
- invites fall back to copyable links
- password reset needs operator help

If you want email invites and password reset emails, set:

```bash
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="Domek <noreply@example.com>"
SMTP_SECURE="false"
```

After updating `.env`, restart the app:

```bash
docker compose up -d
```

## Updating Domek

When you pull a newer version:

```bash
git pull
docker compose up -d --build
```

If the release includes database changes, run migrations:

```bash
docker compose exec web npx prisma migrate deploy
```

## Backups

Your data lives in PostgreSQL.

For a simple setup, make sure you back up:

- your `.env`
- your PostgreSQL data volume

This repo also includes PostgreSQL backup scripts in `scripts/` for more advanced setups.

## Optional push notifications

Web push reminders are optional.

To enable them, generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Then set:

```bash
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_MAILTO="mailto:admin@example.com"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
```

The included `scheduler` service will call:

```bash
POST /api/notify/send
Authorization: Bearer <NOTIFY_SECRET>
```

## Troubleshooting

### Domek does not start

Check the logs:

```bash
docker compose logs -f
```

### I forgot a password and SMTP is not configured

Set a password manually from the checked-out repo on the host machine:

```bash
npm run auth:set-password -- --email user@example.com --password 'new-password'
```

This command uses your local `.env` and is meant to be run where the repo is checked out.

### I changed the database username or password and login broke

Make sure these values still match each other:

```bash
POSTGRES_USER=
POSTGRES_PASSWORD=
DATABASE_URL=
CONTAINER_DATABASE_URL=
```

Then restart the stack:

```bash
docker compose up -d --build
```

### I changed `.env` but nothing happened

Restart the services:

```bash
docker compose up -d --build
```

## Developer notes

Everything below is for local development, maintenance, or repo work.

### Stack

- Next.js App Router
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Docker Compose

### Local development

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Important environment values

Required core values:

```bash
# Required. Set to the URL you use to open the app.
APP_URL="http://localhost:3000"
AUTH_SECRET="replace-with-a-long-random-secret"
DATABASE_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
CONTAINER_DATABASE_URL="postgresql://domek:domek@postgres:5432/domek?schema=public"
POSTGRES_DB="domek"
POSTGRES_USER="domek"
POSTGRES_PASSWORD="domek"
POSTGRES_PORT="5432"
```

Optional direct connection for migrations and backups:

```bash
# DIRECT_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
```

### Auth migration scripts

Prepare existing users for local auth migration:

```bash
npx tsx scripts/auth-migrate-existing-users.ts
```

Send password setup links for migrated users when SMTP is configured:

```bash
npx tsx scripts/auth-migrate-existing-users.ts --send-emails
```

### Database commands

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:healthcheck
npm run db:deploy:verify
```

### E2E / QA

Set:

```bash
QA_TEST_EMAIL="qa@example.com"
QA_TEST_PASSWORD="replace-with-a-test-password"
```

Then run:

```bash
npm run test:e2e
```

Playwright global setup creates or updates the QA user, ensures it has a household, and logs in through the real password flow.