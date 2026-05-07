# Domek Blogging Execution Strategy

This strategy turns Domek's blog rules from `AGENTS.md` and `README.md` into an execution workflow for agents.

## Goal

Publish practical, SEO-focused household-planning content to the English-only blog surface while keeping routing, metadata, and release flow correct.

## Source-Of-Truth Rules (Must Follow)

- Blog is English-only and lives outside locale-prefixed routes:
  - `/blog`
  - `/blog/[slug]`
  - `/blog/rss.xml`
- Blog content is repo-managed MDX in `content/blog/*.mdx`.
- Frontmatter must match typed validation in `src/lib/blog.tsx`.
- Draft posts must stay excluded from index/sitemap/RSS/public routes.
- Public standalone blog/SEO routes must remain listed in:
  - `PUBLIC_PATHS` in `src/proxy.ts`
  - `NON_LOCALIZED_PATHS` in `src/proxy.ts`
- Metadata surfaces (`src/app/sitemap.ts`, `src/app/robots.ts`) are part of the blog SEO contract.

## Agent Workflow

1. Content agent writes or updates post content.
2. FullStackEngineer validates technical integration (frontmatter, routes, SEO surfaces, and sitemap impact).
3. QA performs final repository actions (commit, push, and PR/MR creation).

## Authoring Checklist (Content Agent)

1. Create/update an MDX file under `content/blog/<slug>.mdx`.
2. Ensure frontmatter is complete and valid for the schema in `src/lib/blog.tsx`.
3. Keep copy practical, household-native, and aligned with Domek tone.
4. Set `draft` intentionally (`true` while preparing, `false` when ready to publish).
5. Include optional article CTA fields only when needed:
   - `ctaTitle`
   - `ctaBody`
   - `ctaLabel`
   - `ctaHref`
6. If adding a new standalone SEO/public route (rare), explicitly flag it for proxy-path review.

## Engineering Review Checklist (FullStackEngineer)

1. Validate frontmatter and slug uniqueness through `src/lib/blog.tsx` constraints.
2. Verify the post appears (or is hidden if draft) on:
   - `/blog`
   - `/blog/[slug]`
   - `/blog/rss.xml`
3. Verify sitemap output includes the post when published (`src/app/sitemap.ts` via blog sitemap entries).
4. Confirm `PUBLIC_PATHS` and `NON_LOCALIZED_PATHS` still cover all standalone blog surfaces.
5. Run minimum verification for touched scope (for example lint/build path relevant to blog changes).

## Required Handoff Sequence

When a blog post is ready:

1. Send to [@FullStackEngineer](agent://e97e9ce2-b43f-469b-ad28-b8b77329aaf3?i=code) to validate integration and update sitemap coverage if needed.
2. After engineering sign-off, hand to [@QA](agent://c666d06d-afdf-43bf-96a8-da244a07f0af?i=bug) to commit, push branch, and create PR/MR.

## Definition Of Done For A Blog Change

1. MDX content and frontmatter are valid.
2. Published/draft behavior is correct across index, RSS, and sitemap.
3. Standalone blog paths remain correctly handled by proxy path lists.
4. QA has committed, pushed, and opened PR/MR with clear summary and verification notes.

## Failure Modes To Avoid

- Adding blog pages under `src/app/[locale]/`.
- Hardcoding translated strings for blog surface meant to stay English-only.
- Forgetting to maintain `PUBLIC_PATHS` / `NON_LOCALIZED_PATHS` for any new standalone blog route.
- Publishing draft content unintentionally.
- Skipping QA handoff for commit/push/PR.
