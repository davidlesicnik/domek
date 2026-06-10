import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ThemeSettings, type ThemePreferenceActionState } from "@/components/account/theme-settings";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { isThemePreference } from "@/lib/theme";
import { getFirstHouseholdMembership } from "@/lib/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accountPage");
  return { title: t("metaTitle") };
}

async function deleteAccountAction(formData: FormData) {
  "use server";

  const confirm = formData.get("confirm");
  if (confirm !== "yes") return await redirect("/app/account?error=confirm");

  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);
  if (membership?.role === "OWNER") {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: membership.householdId },
    });
    if (memberCount > 1) return await redirect("/app/account?error=owner_with_members");
  }

  if (membership?.role === "OWNER") {
    await prisma.$transaction([
      prisma.householdMember.deleteMany({ where: { householdId: membership.householdId } }),
      prisma.household.update({
        where: { id: membership.householdId },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  await prisma.$transaction([
    prisma.householdMember.updateMany({
      where: { accountId: session.user.id },
      data: { accountId: null },
    }),
    prisma.userSession.deleteMany({
      where: { userId: session.user.id },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    }),
  ]);

  return await redirect("/login");
}

async function updateThemePreferenceAction(
  _prevState: ThemePreferenceActionState,
  formData: FormData,
): Promise<ThemePreferenceActionState> {
  "use server";

  const session = await requireAppSession();
  const value = formData.get("themePreference");

  if (!isThemePreference(value)) {
    return {
      error: "invalid_theme_preference",
      success: false,
      themePreference: session.user.themePreference,
    };
  }

  const user = await prisma.user.update({
    data: { themePreference: value },
    select: { themePreference: true },
    where: { id: session.user.id },
  });

  return {
    error: null,
    success: true,
    themePreference: user.themePreference,
  };
}

type AccountPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function firstString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, t, tNotif] = await Promise.all([
    requireAppSession(),
    getTranslations("accountPage"),
    getTranslations("notifications"),
  ]);
  const membership = await getFirstHouseholdMembership(session.user.id);
  const params = (await searchParams) ?? {};
  const errorParam = firstString(params.error);
  const errorMessage =
    errorParam === "confirm"
      ? t("errorConfirm")
      : errorParam === "owner_with_members"
        ? t("errorOwnerWithMembers")
        : null;

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-8 sm:px-6">
      <div className="space-y-5">
        <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-subtle)]">
            {t("settingsLabel")}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--text-strong)]">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {t("signedInAs")}{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              {session.user.email ?? t("unknownUser")}
            </span>
          </p>
          {membership ? (
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {t("householdStatus", { household: membership.household.name })}
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {t("noHouseholdYet")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {!membership ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)]"
                href="/onboarding/household"
              >
                {t("finishSetup")}
              </Link>
            ) : null}
            <form action="/api/auth/signout" method="post">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-4 text-sm font-semibold text-[var(--text-strong)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                type="submit"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </section>

        <ThemeSettings
          action={updateThemePreferenceAction}
          currentThemePreference={session.user.themePreference}
        />

        <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">{tNotif("sectionTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {tNotif("sectionDescription")}
          </p>
          <div className="mt-4">
            <NotificationToggle />
          </div>
        </section>

        <section className="rounded-md border border-[var(--accent-rose-border)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">{t("deleteTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            {membership?.role === "OWNER" ? t("deleteOwnerNote") : t("deleteMemberNote")}
          </p>
          {errorMessage ? (
            <p className="mt-4 rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-rose-text)]">
              {errorMessage}
            </p>
          ) : null}
          {membership?.role === "OWNER" ? (
            <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
              {t("ownerWithMembersNote")}{" "}
              <Link
                className="font-semibold underline underline-offset-2 transition hover:text-[var(--text-strong)]"
                href="/app/household"
              >
                {t("goToHouseholdSettings")}
              </Link>
            </p>
          ) : null}
          <form action={deleteAccountAction} className="mt-4 grid gap-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
              <input
                className="mt-1 h-4 w-4 rounded border-[var(--input-border)]"
                name="confirm"
                type="checkbox"
                value="yes"
              />
              <span>{t("confirmCheckbox")}</span>
            </label>
            <div>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-4 text-sm font-semibold text-[var(--accent-rose-text)] transition hover:opacity-90"
                type="submit"
              >
                {t("deleteButton")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
