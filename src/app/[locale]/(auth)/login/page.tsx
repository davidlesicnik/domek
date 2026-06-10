import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
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

function statusMessage(status: string | null, t: ReturnType<typeof useTranslations>) {
  switch (status) {
    case "registered":
      return { kind: "success", text: t("registered") };
    case "reset_success":
      return { kind: "success", text: t("resetSuccess") };
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
    <main className="min-h-dvh border-t-4 border-[var(--surface-strong)] bg-[var(--page-background)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[980px] items-center">
        <section className="grid w-full gap-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-[var(--shadow-float)] sm:grid-cols-[1.1fr_0.9fr] sm:p-8">
          <LoginLeft />
          <LoginRight locale={locale} nextPath={nextPath} status={status} />
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
      {message ? (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${
            message.kind === "success"
              ? "border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--accent-sage-text)]"
              : "border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] text-[var(--accent-rose-text)]"
          }`}
        >
          {message.text}
        </p>
      ) : null}
      <form action="/auth/login" className="mt-5 grid gap-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] p-4" method="post">
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
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
        <Link className="underline-offset-2 transition hover:text-[var(--text-strong)] hover:underline" href={{ pathname: "/register", query: { next: nextPath } }}>
          {t("createAccount")}
        </Link>
        <Link className="underline-offset-2 transition hover:text-[var(--text-strong)] hover:underline" href={{ pathname: "/forgot-password", query: { next: nextPath } }}>
          {t("forgotPassword")}
        </Link>
      </div>
    </div>
  );
}
