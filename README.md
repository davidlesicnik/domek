# Domek

Domek is a container-first household planner for shared household coordination. The first implementation is a secure, maintainable scaffold: a responsive dashboard shell, OIDC-ready authentication, Prisma/Postgres persistence, and clear conventions for future feature work.

## Roadmap

- Multi-user accounts with OIDC sign-in
- Shared calendar
- Shared to-do list
- Shared notes
- Chore list
- Basic household expense tracker
- Dashboard overview

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS for responsive styling
- Auth.js with a generic OIDC provider
- Prisma with PostgreSQL
- Docker Compose for local and container deployment

## Local Development

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

OIDC is optional for local scaffold work. When the Auth.js and OIDC variables are missing, the dashboard runs in local setup mode. Configure the auth variables before using the app outside local development.

## Environment

Required for a real deployment:

```bash
DATABASE_URL="postgresql://domek:domek@postgres:5432/domek?schema=public"
AUTH_SECRET=""
AUTH_URL="https://domek.example.com"
OIDC_ISSUER="https://login.example.com"
OIDC_CLIENT_ID=""
OIDC_CLIENT_SECRET=""
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
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

The initial schema includes users, households, household membership, and the Auth.js adapter tables. Feature-specific tables for calendar, tasks, notes, chores, and expenses should be added with the feature that needs them.

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
