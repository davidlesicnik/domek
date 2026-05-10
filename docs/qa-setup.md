# QA E2E Setup

This project uses Playwright `globalSetup` to authenticate a QA test account before e2e runs.

## 1. Create the QA account in Supabase Auth

1. Open Supabase Dashboard -> Authentication -> Users.
2. Create a user with the email you want to use for e2e tests.
3. Confirm the user so magic-link login can proceed.

## 2. Grant development access in the app database

The QA account must have `developmentAccessGrantedAt` set, otherwise it can be redirected by onboarding/payment guards.

Example SQL in Supabase SQL editor:

```sql
update "User"
set "developmentAccessGrantedAt" = now()
where email = 'qa@example.com';
```

## 3. Configure environment variables

Set these values in your local environment:

- `SUPABASE_SERVICE_ROLE_KEY`: required so Playwright global setup can call `supabase.auth.admin.generateLink`.
- `QA_TEST_EMAIL`: the QA account email from step 1.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: existing app Supabase configuration.

## 4. Run e2e

```bash
npm run test:e2e
```

On each run, global setup will:

1. Generate a Supabase magic link for `QA_TEST_EMAIL`.
2. Open it in headless Chromium.
3. Wait for session cookie creation.
4. Save authenticated state to `playwright/.auth/qa-session.json`.
