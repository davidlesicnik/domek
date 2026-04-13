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

## Stack

- Next.js App Router with TypeScript
- Tailwind CSS
- Auth.js with generic OIDC provider configuration
- Prisma with PostgreSQL
- Docker Compose
- npm

## Boundaries

- Put route orchestration in `src/app`.
- Put reusable UI in `src/components`.
- Put shared server helpers in `src/lib`.
- Keep Prisma schema changes in `prisma/schema.prisma`.
- Do not hardcode provider-specific OIDC secrets or household-specific domains in application code.

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
npm run db:generate
npm run env:check
docker compose config
docker compose build
```

## Security Notes

- Protected app areas should use server-side session checks.
- Use `.env.example` for documented configuration only.
- Validate runtime environment via `src/lib/env.ts`.
- Add database constraints and indexes when adding new data models.
- Keep dependency additions minimal and check `npm audit` after changes.
