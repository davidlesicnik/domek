import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { getCurrentAppSession } from "@/lib/authz";
import { hasHouseholdMembership } from "@/lib/users";
import { AuthNotice, AuthPageShell, authTextLinkClassName } from "../auth-page-shell";
import { safeNextPath, stringParam } from "../auth-page-helpers";
import { LoginForm } from "./login-form";

type LoginPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function statusMessage(
  status: string | null,
  t: ReturnType<typeof useTranslations>,
): LoginStatusMessage {
  switch (status) {
    case "registered":
      return { kind: "success", text: t("registered") };
    case "reset_success":
      return { kind: "success", text: t("resetSuccess") };
    case "password_not_set":
      return { kind: "error", text: t("passwordNotSet") };
    case "setup_error":
      return { kind: "error", text: t("setupError") };
    case "auth_error":
      return { kind: "error", text: t("authError") };
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const locale = await getLocale();
  const nextPath = safeNextPath(stringParam(params.next));
  const session = await getCurrentAppSession();

  if (session) {
    if (await hasHouseholdMembership(session.user.id)) {
      return await redirect(nextPath);
    }
    return await redirect("/onboarding/household");
  }

  const status = stringParam(params.status);

  return (
    <AuthPageShell
      className="grid w-full gap-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:grid-cols-[1.1fr_0.9fr] sm:p-8"
      maxWidthClassName="max-w-[980px]"
    >
      <LoginLeft />
      <LoginRight locale={locale} nextPath={nextPath} status={status} />
    </AuthPageShell>
  );
}

function LoginLeft() {
  const t = useTranslations("login");
  return (
    <div className="flex flex-col justify-between gap-10">
      <div>
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-normal text-[var(--text-strong)] sm:text-6xl">
          Domek
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[var(--accent-sage-text)]">
          {t("tagline")}
        </p>
        <p className="mt-4 max-w-lg text-base leading-7 text-[var(--text-muted)]">
          {t("description")}
        </p>
      </div>
    </div>
  );
}

function LoginRight({
  locale,
  nextPath,
  status,
}: {
  locale: string;
  nextPath: string;
  status: string | null;
}) {
  const t = useTranslations("login");
  const message = statusMessage(status, t);

  return (
    <div className="self-center">
      <h2 className="font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        {t("subtitle")}
      </p>
      {message ? <AuthNotice kind={message.kind} text={message.text} /> : null}
      <LoginForm locale={locale} nextPath={nextPath} />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
        <Link className={authTextLinkClassName} href={{ pathname: "/register", query: { next: nextPath } }}>
          {t("createAccount")}
        </Link>
        <Link className={authTextLinkClassName} href={{ pathname: "/forgot-password", query: { next: nextPath } }}>
          {t("forgotPassword")}
        </Link>
      </div>
    </div>
  );
}
type LoginStatusMessage =
  | {
      kind: "error" | "success";
      text: string;
    }
  | null;
