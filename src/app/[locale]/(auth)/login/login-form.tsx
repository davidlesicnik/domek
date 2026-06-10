import { useTranslations } from "next-intl";

export function LoginForm({
  locale,
  nextPath,
}: {
  locale: string;
  nextPath: string;
}) {
  const t = useTranslations("login");

  return (
    <form
      action="/api/auth/login"
      className="mt-5 grid gap-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] p-4"
      method="post"
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="next" type="hidden" value={nextPath} />
      <label className="grid gap-2 text-sm font-semibold text-[var(--text-strong)]">
        {t("emailLabel")}
        <input
          autoComplete="email"
          className="h-11 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)]"
          maxLength={320}
          name="email"
          placeholder={t("emailPlaceholder")}
          required
          type="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[var(--text-strong)]">
        {t("passwordLabel")}
        <input
          autoComplete="current-password"
          className="h-11 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)]"
          maxLength={200}
          name="password"
          placeholder={t("passwordPlaceholder")}
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
