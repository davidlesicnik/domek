import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AuthFormCard, AuthPageShell, authTextLinkClassName } from "../auth-page-shell";
import { safeNextPath, stringParam } from "../auth-page-helpers";
import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const nextPath = safeNextPath(stringParam(params.next));
  const token = stringParam(params.token) ?? "";
  const status = stringParam(params.status);
  const t = await getTranslations("resetPassword");
  const notice = status === "token_error" ? { kind: "error" as const, text: t("tokenError") } : null;

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
          <ResetPasswordForm locale={locale} nextPath={nextPath} token={token} />
      </AuthFormCard>
    </AuthPageShell>
  );
}
