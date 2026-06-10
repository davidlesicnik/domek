import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/i18n/routing";
import { ForgotPasswordForm } from "./forgot-password-form";

type ForgotPasswordPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  const stripped = stripLocalePrefix(value);
  if (
    stripped.startsWith("/login") ||
    stripped.startsWith("/register") ||
    stripped.startsWith("/forgot-password") ||
    stripped.startsWith("/reset-password")
  ) {
    return "/app";
  }

  return value;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const nextPath = safeNextPath(stringParam(params.next));
  const status = stringParam(params.status);
  const t = await getTranslations("forgotPassword");

  return (
    <main className="min-h-dvh border-t-4 border-[var(--surface-strong)] bg-[var(--page-background)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[760px] items-center">
        <section className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-sage-text)]">{t("label")}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-normal text-[var(--text-strong)]">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-muted)]">{t("subtitle")}</p>
          {status === "reset_sent" ? (
            <p className="mt-4 rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 py-2 text-sm font-medium text-[var(--accent-sage-text)]">
              {t("resetSent")}
            </p>
          ) : status === "reset_manual" ? (
            <p className="mt-4 rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 py-2 text-sm font-medium text-[var(--accent-sage-text)]">
              {t("resetManual")}
            </p>
          ) : status === "reset_error" ? (
            <p className="mt-4 rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-rose-text)]">
              {t("resetError")}
            </p>
          ) : null}
          <ForgotPasswordForm locale={locale} nextPath={nextPath} />
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            <Link className="underline-offset-2 transition hover:text-[var(--text-strong)] hover:underline" href={{ pathname: "/login", query: { next: nextPath } }}>
              {t("backToLogin")}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
