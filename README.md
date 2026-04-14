# Domek

Domek is a container-first household planner for shared household coordination. The first implementation is a secure, maintainable scaffold: a responsive dashboard shell, Supabase OAuth authentication, Prisma/Postgres persistence, and clear conventions for future feature work.

## Roadmap

- Multi-user accounts with Supabase OAuth sign-in
- Shared calendar
- Shared to-do list
- Shared notes
- Chore list
- Basic household expense tracker
- Dashboard overview

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS for responsive styling
- Supabase Auth with OAuth providers
- Prisma with PostgreSQL
- Docker Compose for local and container deployment

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

Required for a real deployment:

```bash
DATABASE_URL="postgresql://domek:domek@localhost:5432/domek?schema=public"
CONTAINER_DATABASE_URL="postgresql://domek:domek@postgres:5432/domek?schema=public"
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```

Validate deployment configuration with:

```bash
npm run env:check
```

## Database

Generate the Prisma client:

```bash
npm run db:generate
```

Create and apply a development migration after the database is reachable:

```bash
npm run db:migrate
```

The initial schema includes users, households, household membership, and feature-specific tables for calendar, tasks, notes, shopping, and expenses. Supabase Auth owns identity; Prisma keeps a slim `User` row keyed by the Supabase auth UUID for application foreign keys.

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
