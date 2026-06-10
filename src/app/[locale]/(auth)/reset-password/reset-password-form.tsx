import { useTranslations } from "next-intl";

export function ResetPasswordForm({
  locale,
  nextPath,
  token,
}: {
  locale: string;
  nextPath: string;
  token: string;
}) {
  const t = useTranslations("resetPassword");

  return (
    <form
      action="/api/auth/reset-password"
      className="mt-6 grid gap-3"
      method="post"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="next" type="hidden" value={nextPath} />
      <input name="token" type="hidden" value={token} />
      <label className="grid gap-2 text-sm font-semibold text-[var(--text-strong)]">
        {t("passwordLabel")}
        <input
          autoComplete="new-password"
          className="h-11 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-sm text-[var(--text-primary)] outline-none"
          maxLength={200}
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <button
        className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)]"
        type="submit"
      >
        {t("submit")}
      </button>
    </form>
  );
}
