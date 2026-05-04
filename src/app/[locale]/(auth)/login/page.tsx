import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

import { SignInOptions } from "@/components/auth/sign-in-options";
import { redirect } from "@/i18n/server";
import { stripLocalePrefix } from "@/i18n/routing";
import { getCurrentAppSession } from "@/lib/authz";
import { hasHouseholdMembership } from "@/lib/users";

type LoginPageProps = Readonly<{
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

  // Block both bare and locale-prefixed login/callback paths
  const stripped = stripLocalePrefix(value);
  if (stripped.startsWith("/login") || stripped.startsWith("/auth/callback")) {
    return "/app";
  }

  if (value.includes("code=")) {
    return "/app";
  }

  return value;
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

  const hasAuthError = stringParam(params.error) === "auth";
  const hasMagicLinkSent = stringParam(params.email) === "sent";

  return (
    <main className="min-h-dvh border-t-4 border-[var(--surface-strong)] bg-[var(--page-background)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[980px] items-center">
        <section className="grid w-full gap-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
          <LoginLeft />
          <LoginRight
            hasAuthError={hasAuthError}
            hasMagicLinkSent={hasMagicLinkSent}
            locale={locale}
            nextPath={nextPath}
          />
        </section>
      </div>
    </main>
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
  hasAuthError,
  hasMagicLinkSent,
  locale,
  nextPath,
}: {
  hasAuthError: boolean;
  hasMagicLinkSent: boolean;
  locale: string;
  nextPath: string;
}) {
  const t = useTranslations("login");
  return (
    <div className="self-center">
      <h2 className="font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        {t("subtitle")}
      </p>
      {hasAuthError ? (
        <p className="mt-4 rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-rose-text)]">
          {t("authError")}
        </p>
      ) : null}
      {hasMagicLinkSent ? (
        <p className="mt-4 rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 py-2 text-sm font-medium text-[var(--accent-sage-text)]">
          {t("magicLinkSent")}
        </p>
      ) : null}
      <div className="mt-5">
        <SignInOptions locale={locale} nextPath={nextPath} />
      </div>
    </div>
  );
}
