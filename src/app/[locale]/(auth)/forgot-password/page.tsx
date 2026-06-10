import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AuthFormCard, AuthPageShell, authTextLinkClassName } from "../auth-page-shell";
import { safeNextPath, stringParam } from "../auth-page-helpers";
import { ForgotPasswordForm } from "./forgot-password-form";

type ForgotPasswordPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const nextPath = safeNextPath(stringParam(params.next));
  const status = stringParam(params.status);
  const t = await getTranslations("forgotPassword");
  const notice =
    status === "reset_sent"
      ? { kind: "success" as const, text: t("resetSent") }
      : status === "reset_manual"
        ? { kind: "success" as const, text: t("resetManual") }
        : status === "reset_error"
          ? { kind: "error" as const, text: t("resetError") }
          : null;

  return (
    <AuthPageShell
      className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:p-8"
      maxWidthClassName="max-w-[760px]"
    >
      <AuthFormCard
        footer={
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            <Link className={authTextLinkClassName} href={{ pathname: "/login", query: { next: nextPath } }}>
              {t("backToLogin")}
            </Link>
          </p>
        }
        label={t("label")}
        notice={notice}
        subtitle={t("subtitle")}
        title={t("title")}
      >
          <ForgotPasswordForm locale={locale} nextPath={nextPath} />
      </AuthFormCard>
    </AuthPageShell>
  );
}
