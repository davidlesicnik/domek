# OSS Public-Readiness Audit

## Result

`safe after working-tree cleanup`

## What was cleaned up in the self-hosted migration

- Removed Supabase-specific runtime code and setup docs.
- Removed Paddle billing routes, helpers, and hosted checkout code.
- Removed analytics script injection from the app shell.
- Rewrote environment examples and README for self-hosting.

## Git history spot check

History contains many references to hosted providers such as Supabase, Paddle, Railway, and Google integrations, but the spot check did not surface committed `.env` files, auth storage snapshots, or obvious inline secret values.

Reviewed indicators included:

- `.env` and `.env.*` filenames in history
- backup and auth helper filenames
- commit subjects containing `secret`, `token`, `password`, `supabase`, `paddle`, `railway`, `oauth`, and `google`

## Remaining checklist before opening the repo

- Review deleted docs and removed deployment notes one more time for any sensitive business-only wording.
- Confirm no real credentials exist in the current `.env` or local backup env files outside git.
- Optionally run a dedicated secret scanner across git history before making the repository public.

## Recommendation

Publish the repo from the current tree after the self-hosted cleanup lands, and do one final automated history scan before changing repository visibility.
