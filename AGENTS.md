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
- Supabase Auth with OAuth provider configuration
- Prisma with PostgreSQL
- Docker Compose
- npm

## Boundaries

- Put route orchestration in `src/app`.
- Put reusable UI in `src/components`.
- Put shared server helpers in `src/lib`.
- Keep Prisma schema changes in `prisma/schema.prisma`.
- Do not hardcode provider-specific OAuth secrets or household-specific domains in application code.
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

## Production Migrations (Railway)

- Run production migrations via Railway Pre-deploy Command so schema changes are applied before app startup.
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
- The production Docker image ships Prisma CLI plus `scripts/db-deploy-verify.mjs` and `scripts/db-healthcheck.mjs`; keep those files available for Railway Pre-deploy execution.
- Never use `prisma migrate dev` or `prisma db push` in production.

## Routing and Auth Middleware

All requests pass through `src/proxy.ts` before reaching any page. It checks the Supabase session and redirects unauthenticated users to `/login?next=<path>` for any path not in `PUBLIC_PATHS`.

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

## Blog

- The SEO blog is intentionally English-only and lives outside the locale-prefixed tree at `/blog`.
- Blog content is repo-managed MDX in `content/blog/*.mdx`; do not move it into the database or `messages/*.json`.
- The content loader and frontmatter schema live in `src/lib/blog.tsx`. Keep frontmatter typed and validated server-side.
- Use optional per-article CTA fields (`ctaTitle`, `ctaBody`, `ctaLabel`, `ctaHref`) when the article needs a contextual bottom CTA. Keep article CTAs to one block at the end unless the user explicitly asks for a different pattern.
- `src/app/sitemap.ts` and `src/app/robots.ts` are part of the blog/SEO surface. If you add new public SEO pages, include them in sitemap/robots considerations.
- Any new public blog/SEO route must also be added to `PUBLIC_PATHS` in `src/proxy.ts`, and if it lives outside `src/app/[locale]/`, also to `NON_LOCALIZED_PATHS`.
- `src/lib/site.ts` defines the canonical origin used by metadata routes. Do not revert it to localhost fallbacks for sitemap or robots output.

## Security Notes

- Protected app areas should use server-side session checks.
- Use `.env.example` for documented configuration only.
- Validate runtime environment via `src/lib/env.ts`.
- Add database constraints and indexes when adding new data models.
- Keep dependency additions minimal and check `npm audit` after changes.
