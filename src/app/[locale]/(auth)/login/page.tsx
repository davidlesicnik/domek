import { useTranslations } from "next-intl";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
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
  const nextPath = safeNextPath(stringParam(params.next));
  const session = await getCurrentAppSession();

  if (session) {
    if (await hasHouseholdMembership(session.user.id)) {
      return await redirect(nextPath);
    }
    return await redirect("/onboarding/household");
  }

  const hasAuthError = stringParam(params.error) === "auth";

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[980px] items-center">
        <section className="grid w-full gap-8 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
          <LoginLeft />
          <LoginRight hasAuthError={hasAuthError} nextPath={nextPath} />
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
        <h1 className="mt-3 font-serif text-5xl font-semibold tracking-normal text-[#171a18] sm:text-6xl">
          Domek
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#526c56]">
          {t("tagline")}
        </p>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
          {t("description")}
        </p>
      </div>
    </div>
  );
}

function LoginRight({ hasAuthError, nextPath }: { hasAuthError: boolean; nextPath: string }) {
  const t = useTranslations("login");
  return (
    <div className="self-center">
      <h2 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#686e6a]">
        {t("subtitle")}
      </p>
      {hasAuthError ? (
        <p className="mt-4 rounded-md border border-[#dfb4a8] bg-[#fff5f1] px-3 py-2 text-sm font-medium text-[#a6543c]">
          {t("authError")}
        </p>
      ) : null}
      <div className="mt-5">
        <OAuthButtons nextPath={nextPath} />
      </div>
    </div>
  );
}
