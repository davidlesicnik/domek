# QA E2E Setup

Playwright now authenticates against Domek's local email/password flow.

## Required environment

Set these values before running e2e:

```bash
QA_TEST_EMAIL="qa@example.com"
QA_TEST_PASSWORD="replace-with-a-test-password"
```

## What global setup does

On each run, `playwright/global-setup.ts` will:

1. Create the QA user locally if it does not exist.
2. Upsert a local password credential for that user.
3. Ensure the user belongs to a household so dashboard routes are reachable.
4. Sign in through `/en-US/login`.
5. Save authenticated state to `playwright/.auth/qa-session.json`.

## Run e2e

```bash
npm run test:e2e
```
