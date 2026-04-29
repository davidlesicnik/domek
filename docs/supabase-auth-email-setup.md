# Supabase Auth Email Setup

Use these settings in the Supabase dashboard so auth emails match Domek's invite emails.

## Resend SMTP

Open `Authentication -> Email -> SMTP Settings` in Supabase and set:

- Sender name: `Domek`
- Sender email: your verified sending address, for example `noreply@domekapp.com`
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key

Resend's current SMTP guide:

- [Resend SMTP](https://resend.com/docs/send-with-smtp)
- [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)

## Supabase Templates

Open `Authentication -> Email -> Templates` in Supabase and update these templates:

- `Confirm signup`
  Subject: `Confirm your email for Domek`
  HTML: paste `docs/supabase-confirm-signup-template.html`
- `Magic Link`
  Subject: `Sign in to Domek`
  HTML: paste `docs/supabase-magic-link-template.html`

The templates intentionally use `{{ .RedirectTo }}` plus `{{ .TokenHash }}` so Supabase lands on Domek's server callback with readable query params instead of fragment-only session data.

Current link patterns:

- Confirm signup: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`
- Magic Link: `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink`

Reference:

- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## Why both templates matter

With Domek's passwordless flow, Supabase can send different auth emails depending on user state:

- `Confirm signup` for first-time email confirmation
- `Magic Link` for passwordless sign-in

Keeping both templates visually aligned avoids the default Supabase email showing up for new users.
