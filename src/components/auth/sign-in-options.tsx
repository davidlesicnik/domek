"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type SignInOptionsProps = Readonly<{
  nextPath: string;
}>;

export function SignInOptions({ nextPath }: SignInOptionsProps) {
  const t = useTranslations("login");

  return (
    <div className="grid gap-4">
      <Link
        className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)]"
        href={{ pathname: "/login", query: { next: nextPath } }}
      >
        {t("title")}
      </Link>
      <Link
        className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--focus-ring)] hover:bg-[var(--surface-secondary)]"
        href={{ pathname: "/register", query: { next: nextPath } }}
      >
        {t("createAccount")}
      </Link>
    </div>
  );
}
