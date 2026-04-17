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
DATABASE_URL="postgresql://postgres.PROJECT_REF:YOUR_DB_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?schema=public"
SUPABASE_URL="https://PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_or_anon_key"
RESEND_API_KEY="re_your_server_secret"
FROM_EMAIL="Domek <noreply@yourdomain.com>"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
APP_URL="https://your-service.up.railway.app"
```

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

### Railway 502 Checklist

If the Railway app shows 502s:

- Confirm the service is using the Dockerfile and the start command is `node server.js`, or leave the start command blank so Docker's `CMD` is used.
- Confirm `PORT=3000`.
- Confirm `HOSTNAME=0.0.0.0`.
- Confirm the Railway public domain target port is `3000`.
- Check logs for the Next.js startup line and verify it reports port `3000`.
- Confirm `DATABASE_URL` points to Supabase Postgres, not `localhost`.
- URL-encode special characters in the database password, especially `@`, `#`, `%`, `/`, `:`, `?`, and `&`.

## Trial and Access

Domek uses a 30-day free trial. The trial clock starts when the household is created (`Household.createdAt`). After 30 days without payment, users are redirected to `/trial-ended` and cannot access the app until the household is activated.

**Trial states** (defined in `src/lib/trial.ts`):

| State | Condition | Effect |
|---|---|---|
| `active` | `paidAt` set, or dev access granted | Full access, no banner |
| `trial` | < 27 days elapsed | No banner (nudge shown after 14 days if 2+ members) |
| `expiring` | 1–3 days remaining | Warning banner shown in the app |
| `expired` | > 30 days elapsed, unpaid | Redirected to `/trial-ended` |

Activation is tracked via `Household.paidAt`. The `/trial-ended` page has a mock "Continue with Domek" action that sets this directly — replace the server action with a Paddle checkout redirect when payment is wired up.

**Development access codes** (entered on the household creation screen):

- `domekappdevelopment` — grants permanent dev access (`User.developmentAccessGrantedAt`), bypasses the trial entirely
- `domekbeta` — allows household creation as a regular trial user, so the 30-day clock starts normally (useful for testing trial banners and the paywall)

The access code field is hidden automatically once a user already has dev access, so recreating households during development does not require re-entering the code.

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

## Quality And Security

- Keep strict TypeScript enabled.
- Keep secrets out of Git; commit only `.env.example`.
- Add database constraints and indexes with the data model, not as a cleanup step later.
- Keep route-level auth checks server-side for protected areas.
- Prefer small, typed modules over large route files.
- Run `npm run lint`, `npm run build`, `docker compose config`, and `docker compose build` before handing off changes.
