import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { getCurrentAppSession } from "@/lib/authz";
import { hasHouseholdMembership } from "@/lib/users";
import { AuthFormCard, AuthPageShell, authTextLinkClassName } from "../auth-page-shell";
import { safeNextPath, stringParam } from "../auth-page-helpers";
import { RegisterForm } from "./register-form";

type RegisterPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const nextPath = safeNextPath(stringParam(params.next));
  const status = stringParam(params.status);
  const session = await getCurrentAppSession();

  if (session) {
    if (await hasHouseholdMembership(session.user.id)) {
      return await redirect(nextPath);
    }
    return await redirect("/onboarding/household");
  }

  const t = await getTranslations("register");
  const notice =
    status === "account_exists"
      ? { kind: "error" as const, text: t("accountExists") }
      : status === "password_not_set"
        ? { kind: "error" as const, text: t("passwordNotSet") }
        : status === "setup_error"
          ? { kind: "error" as const, text: t("setupError") }
          : status === "register_error"
            ? { kind: "error" as const, text: t("registerError") }
            : null;

  return (
    <AuthPageShell
      className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:p-8"
      maxWidthClassName="max-w-[760px]"
    >
      <AuthFormCard
        footer={
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {t("loginPrompt")}{" "}
            <Link
              className={authTextLinkClassName}
              href={{ pathname: "/login", query: { next: nextPath, status: status === "registered" ? "registered" : undefined } }}
            >
              {t("loginLink")}
            </Link>
          </p>
        }
        label={t("label")}
        labelTone="rose"
        notice={notice}
        subtitle={t("subtitle")}
        title={t("title")}
      >
          <RegisterForm locale={locale} nextPath={nextPath} />
      </AuthFormCard>
    </AuthPageShell>
  );
}
