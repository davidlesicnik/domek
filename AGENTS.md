<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses current Next.js App Router conventions. Before changing framework-sensitive code, check the installed docs and types in `node_modules/next/dist/docs/` and the local package versions.
<!-- END:nextjs-agent-rules -->

# Domek Agent Guide

## Project Priorities

- Long-term maintainability, code quality, and security are first-class requirements.
- Keep changes small and typed. Prefer explicit interfaces and clear module boundaries.
- Do not commit secrets or local `.env` files.
- Keep the app container-deployment first.
- Never pre-create placeholder data, demo records, fake household content, or seeded sample entries. New data should come from user input, migrations, imports, or explicit user requests.
- Any new user-data feature must be database-backed by default: persist user-created records, load saved data on page render, validate writes server-side, and avoid client-only state as the source of truth unless the user explicitly asks for a temporary prototype.

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Self-hosted email/password auth
- Prisma with PostgreSQL
- Docker Compose
- npm

## Boundaries

- Put route orchestration in `src/app`.
- Put reusable UI in `src/components`.
- Put shared server helpers in `src/lib`.
- Keep Prisma schema changes in `prisma/schema.prisma`.
- Do not hardcode auth secrets, external service credentials, or household-specific domains in application code.
- Reuse shared UI primitives when they already exist. For onboarding/callout bubbles, prefer `src/components/ui/onboarding-tooltip.tsx` over custom tooltip markup.

## Product And Visual Direction

- Domek should feel like a calm home-planning board, not a corporate admin dashboard.
- Use the current dashboard as the visual baseline: slim top chrome, serif display headings, centered content, compact status pills, understated cards, and small feature markers.
- Product copy should sound household-native and practical. Prefer phrases like "Home board", "On the table", and "Everything in one place" over generic SaaS wording like "Overview", "Roadmap", or "productivity hub".
- Keep the UI responsive and touch-friendly on mobile; horizontal nav scrolling is acceptable for the first slice.
- Avoid one-note palettes and avoid dominant purple, beige/cream/sand/tan, dark blue/slate, or brown/orange themes. If using warm neutrals, balance them with muted green, rose, yellow, or other non-corporate accents.
- Keep border radii at 8px or less and avoid decorative orbs, bokeh blobs, nested cards, and marketing-style hero sections.

## Commands

```bash
npm run lint
npm run build
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:healthcheck
npm run db:deploy:verify
npm run env:check
docker compose config
docker compose build
```

## Local Verification Hygiene

- If you start a local dev server for verification (for example `npm run dev`), treat it as temporary and stop it when you are done.
- Before wrapping up, verify that any port you used for ad hoc local servers is no longer occupied by a stray app process (for example with `lsof -nP -iTCP:3000 -sTCP:LISTEN`).
- Do not leave background Next.js dev servers running after checks; they can mask the Docker app and cause confusing localhost behavior.

## Production Migrations

- Run production migrations before app startup so schema changes are applied before the container begins serving traffic.
- Use this command for production deploy checks:

```bash
npm run db:deploy:verify
```

- `db:deploy:verify` must run:
  - `npm run db:migrate:deploy`
  - `npm run db:migrate:status`
  - `npm run db:healthcheck`
- `DIRECT_URL` must be set for migrations; `db:deploy:verify` fails fast when it is missing/invalid.
- Use `MIGRATION_DEPLOY_TIMEOUT_MS` (default `300000`) to cap migration step runtime and surface stuck-lock troubleshooting.
- Keep the runtime start command app-only (`node server.js` or `npm run start`), without migration commands.
- The production Docker image ships Prisma CLI plus `scripts/db-deploy-verify.mjs` and `scripts/db-healthcheck.mjs`; keep those files available for your deploy pipeline or pre-start migration step.
- Never use `prisma migrate dev` or `prisma db push` in production.

## Routing and Auth Middleware

All requests pass through `src/proxy.ts` before reaching any page. It checks the current app session and redirects unauthenticated users to `/login?next=<path>` for any path not in `PUBLIC_PATHS`.

**Any new public page (marketing, legal, etc.) must be added to `PUBLIC_PATHS` in `src/proxy.ts` or it will redirect unauthenticated visitors to login.**

**Treat this as part of creating the route itself: if a route should be reachable without auth, update `PUBLIC_PATHS` in the same change. Do not ship a public route without that proxy update.**

Current public paths are listed at the top of `src/proxy.ts`. When debugging unexpected redirects to `/login`, check `PUBLIC_PATHS` first.

Standalone public routes that should bypass locale prefixing, such as `/blog`, `/blog/rss.xml`, `/robots.txt`, and `/sitemap.xml`, must also be considered in `NON_LOCALIZED_PATHS`. If a route exists outside `src/app/[locale]/` and unexpectedly redirects or 404s under `/<locale>/...`, check `NON_LOCALIZED_PATHS` first.

## Internationalization (i18n)

i18n is a first-class requirement. The app supports English (`en`) and Slovenian (`sl`) via URL path prefixes (`/en/...`, `/sl/...`) using **next-intl**.

Rules that apply to every new feature or page:

- **New pages** must live under `src/app/[locale]/`. Never add a new page outside this segment (except route handlers under `src/app/api/` and `src/app/auth/`, plus the existing standalone SEO surfaces such as `/blog`, `/blog/rss.xml`, `/robots.txt`, and `/sitemap.xml`).
- **New user-facing strings** must be added to both `messages/en.json` and `messages/sl.json` before shipping. Do not hardcode display strings in components.
- **Links and redirects** must use `@/i18n/navigation` (`Link`, `redirect`, `useRouter`, `usePathname`), not `next/link` or `next/navigation`. Exception: route handlers and `src/proxy.ts` keep native Next.js imports, and links that must intentionally stay outside locale prefixing (for example `/blog`) should use native `next/link`.
- **`Intl` formatting** (dates, numbers) must use the current locale. In Server Components use `await getLocale()` from `next-intl/server`; in Client Components use `useLocale()` from `next-intl`.
- Translation files live at `messages/en.json` and `messages/sl.json`. Namespace keys by feature area (e.g. `nav`, `footer`, `onboarding`).
- Legal prose pages (`/privacy`, `/terms`, `/refund-policy`, `/cookies`) are English-only — no Slovenian translation required for them.

## Web Push Notifications

The app uses VAPID-based Web Push (via `web-push` npm package) for opt-in daily reminders.

### Key files

| File | Role |
|------|------|
| `public/sw.js` | Service worker — handles `push` and `notificationclick` events |
| `src/app/api/push/subscribe/route.ts` | Auth-gated `POST`/`DELETE` to manage `PushSubscription` records |
| `src/app/api/notify/send/route.ts` | Cron endpoint — validates `NOTIFY_SECRET`, calls `sendDailyNotifications()` |
| `src/lib/notifications/sender.ts` | `sendDailyNotifications()` — fetches subs, queries calendar/todos/chores, sends push |
| `src/components/pwa/notification-toggle.tsx` | Client toggle — subscribe/unsubscribe UI, mounted on account page |

### Required env vars

```
VAPID_PUBLIC_KEY=        # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_MAILTO=            # e.g. mailto:admin@domekapp.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # same value as VAPID_PUBLIC_KEY, exposed to browser
NOTIFY_SECRET=           # arbitrary secret; sent as Bearer token by cron caller
```

### Cron setup

Schedule a daily HTTP call:
```
POST /api/notify/send
Authorization: Bearer <NOTIFY_SECRET>
```

### Auth boundaries

- `/api/push/subscribe` is **auth-gated** — do NOT add to `PUBLIC_PATHS`.
- `/api/notify/send` is in `PUBLIC_PATHS` — it uses its own `NOTIFY_SECRET` bearer auth.

### Dead subscription pruning

`sendDailyNotifications()` auto-deletes `PushSubscription` rows when the push service returns 404 or 410.

## Git Workflow

Every agent MUST follow this workflow for every assigned task:

### Starting work

1. **Create a fresh branch** from `main` before writing any code:
   ```bash
   git checkout main && git pull
   git checkout -b feat/<short-description>   # or fix/, chore/, etc.
   ```
2. Never commit directly to `main` or reuse a stale branch from a previous task.
3. Branch name should reflect the task — use the issue identifier when possible (e.g. `feat/DOMA-42-calendar-reminders`).

### Finishing work

1. Push commits to the feature branch and open a PR targeting `main`.
2. Hand the PR to QA for review (set issue status to `in_review`, link the PR).
3. Do **not** merge or push to `main` yourself.

### QA sign-off

1. QA reviews the branch and verifies the work.
2. When approved, QA commits any final fixups and pushes to the feature branch.
3. Commit message must follow Conventional Commits: `type(scope): subject` — e.g. `feat(chores): add recurrence support`.
4. QA opens a GitHub PR targeting `main` and marks the issue `done`.
5. Do **not** merge the PR — leave that to the board/maintainer.

## Security Notes

- Protected app areas should use server-side session checks.
- Use `.env.example` for documented configuration only.
- Validate runtime environment via `src/lib/env.ts`.
- Add database constraints and indexes when adding new data models.
- Keep dependency additions minimal and check `npm audit` after changes.
