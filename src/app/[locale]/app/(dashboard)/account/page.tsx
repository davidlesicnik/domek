import type { Metadata } from "next";
import { BillingSubscriptionStatus } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";

import { ThemeSettings, type ThemePreferenceActionState } from "@/components/account/theme-settings";
import { NotificationToggle } from "@/components/pwa/notification-toggle";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getOptionalPaddleServerConfig } from "@/lib/env";
import {
  disconnectGoogleCalendarConnection,
  getOptionalGoogleOAuthConfig,
  syncGoogleCalendarForUser,
} from "@/lib/google-calendar";
import {
  cancelPaddleSubscriptionAtPeriodEnd,
  cancelPaddleSubscriptionImmediately,
  PaddleSubscriptionCancelError,
} from "@/lib/paddle-server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { isThemePreference } from "@/lib/theme";
import { getFirstHouseholdMembership } from "@/lib/users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("accountPage");
  return { title: t("metaTitle") };
}

async function cancelSubscriptionAction() {
  "use server";

  const session = await requireAppSession();
  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      id: true,
      paddleSubscriptionId: true,
      status: true,
      scheduledCancellationAt: true,
    },
    where: { userId: session.user.id },
  });

  if (
    !billingSubscription?.paddleSubscriptionId ||
    billingSubscription.status === BillingSubscriptionStatus.CANCELED ||
    billingSubscription.scheduledCancellationAt
  ) {
    return await redirect("/app/account");
  }

  const paddleServer = getOptionalPaddleServerConfig();

  if (!paddleServer) {
    return await redirect("/app/account?error=billing_not_configured");
  }

  try {
    const updatedSubscription = await cancelPaddleSubscriptionAtPeriodEnd({
      apiKey: paddleServer.apiKey,
      clientToken: paddleServer.clientToken,
      subscriptionId: billingSubscription.paddleSubscriptionId,
    });

    await prisma.billingSubscription.update({
      data: {
        canceledAt: updatedSubscription.canceledAt,
        currentPeriodEndsAt: updatedSubscription.currentPeriodEndsAt,
        scheduledCancellationAt: updatedSubscription.scheduledCancellationAt,
        status: updatedSubscription.status,
      },
      where: { id: billingSubscription.id },
    });
  } catch (error) {
    if (error instanceof PaddleSubscriptionCancelError) {
      return await redirect("/app/account?error=subscription_cancel_failed");
    }

    throw error;
  }

  return await redirect("/app/account");
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

  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      id: true,
      paddleSubscriptionId: true,
      status: true,
    },
    where: { userId: session.user.id },
  });

  if (
    billingSubscription?.paddleSubscriptionId &&
    billingSubscription.status !== BillingSubscriptionStatus.CANCELED
  ) {
    const paddleServer = getOptionalPaddleServerConfig();

    if (!paddleServer) {
      return await redirect("/app/account?error=billing_not_configured");
    }

    try {
      const canceledSubscription = await cancelPaddleSubscriptionImmediately({
        apiKey: paddleServer.apiKey,
        clientToken: paddleServer.clientToken,
        subscriptionId: billingSubscription.paddleSubscriptionId,
      });

      await prisma.billingSubscription.update({
        data: {
          canceledAt: canceledSubscription.canceledAt ?? new Date(),
          currentPeriodEndsAt: canceledSubscription.currentPeriodEndsAt,
          scheduledCancellationAt: canceledSubscription.scheduledCancellationAt,
          status: canceledSubscription.status,
        },
        where: { id: billingSubscription.id },
      });
    } catch (error) {
      if (error instanceof PaddleSubscriptionCancelError) {
        return await redirect("/app/account?error=billing_cancel_failed");
      }

      throw error;
    }
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

  await prisma.householdMember.updateMany({
    where: { accountId: session.user.id },
    data: { accountId: null },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      deletedAt: new Date(),
      developmentAccessGrantedAt: null,
    },
  });

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return await redirect("/login");
}

async function syncGoogleCalendarAction() {
  "use server";

  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (!membership?.householdId) {
    return await redirect("/app/account?error=google_calendar_no_household");
  }

  try {
    await syncGoogleCalendarForUser({
      householdId: membership.householdId,
      userId: session.user.id,
    });
  } catch (error) {
    console.error("[syncGoogleCalendarAction]", error);
    return await redirect("/app/account?error=google_calendar_sync_failed");
  }

  return await redirect("/app/account?googleCalendar=sync_success");
}

async function disconnectGoogleCalendarAction() {
  "use server";

  const session = await requireAppSession();
  await disconnectGoogleCalendarConnection(session.user.id);
  return await redirect("/app/account?googleCalendar=disconnected");
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

const statusKeys: Record<BillingSubscriptionStatus, string> = {
  [BillingSubscriptionStatus.TRIALING]: "statusTrialing",
  [BillingSubscriptionStatus.ACTIVE]: "statusActive",
  [BillingSubscriptionStatus.PAST_DUE]: "statusPastDue",
  [BillingSubscriptionStatus.PAUSED]: "statusPaused",
  [BillingSubscriptionStatus.CANCELED]: "statusCanceled",
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, t, tNotif, locale] = await Promise.all([
    requireAppSession(),
    getTranslations("accountPage"),
    getTranslations("notifications"),
    getLocale(),
  ]);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formatDate = (date: Date | null | undefined) =>
    date ? dateFormatter.format(date) : null;

  const membership = await getFirstHouseholdMembership(session.user.id);
  const billingSubscription = await prisma.billingSubscription.findUnique({
    select: {
      canceledAt: true,
      currentPeriodEndsAt: true,
      scheduledCancellationAt: true,
      startedAt: true,
      status: true,
      trialEndsAt: true,
    },
    where: { userId: session.user.id },
  });

  const params = (await searchParams) ?? {};
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const googleCalendarParam = Array.isArray(params.googleCalendar)
    ? params.googleCalendar[0]
    : params.googleCalendar;

  const isOwnerWithMembers =
    membership?.role === "OWNER"
      ? (await prisma.householdMember.count({
          where: { householdId: membership.householdId },
        })) > 1
      : false;

  const errorMessage =
    errorParam === "confirm"
      ? t("errorConfirm")
      : errorParam === "billing_not_configured"
        ? t("errorBillingNotConfigured")
        : errorParam === "billing_cancel_failed"
          ? t("errorBillingCancelFailed")
          : errorParam === "subscription_cancel_failed"
            ? t("errorSubscriptionCancelFailed")
            : errorParam === "owner_with_members"
              ? t("errorOwnerWithMembers")
              : errorParam === "google_calendar_not_configured"
                ? t("googleCalendarErrorNotConfigured")
                : errorParam === "google_calendar_oauth_failed"
                  ? t("googleCalendarErrorOAuth")
                  : errorParam === "google_calendar_sync_failed"
                    ? t("googleCalendarErrorSync")
                    : errorParam === "google_calendar_no_household"
                      ? t("googleCalendarErrorNoHousehold")
              : null;
  const googleCalendarStatusMessage =
    googleCalendarParam === "connected"
      ? t("googleCalendarConnected")
      : googleCalendarParam === "sync_success"
        ? t("googleCalendarSyncSuccess")
        : googleCalendarParam === "disconnected"
          ? t("googleCalendarDisconnected")
          : null;
  const googleOAuthConfigured = Boolean(getOptionalGoogleOAuthConfig());
  const googleCalendarConnection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: session.user.id },
  });

  const nextPaymentDate =
    billingSubscription?.status === BillingSubscriptionStatus.TRIALING
      ? billingSubscription.trialEndsAt
      : billingSubscription?.currentPeriodEndsAt;
  const accessEndsDate =
    billingSubscription?.scheduledCancellationAt ??
    (billingSubscription?.status === BillingSubscriptionStatus.CANCELED
      ? billingSubscription.canceledAt ?? billingSubscription.currentPeriodEndsAt
      : null);

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
          {t("settingsLabel")}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-normal text-[var(--text-strong)]">
          {t("title")}
        </h1>
      </div>

      <ThemeSettings
        action={updateThemePreferenceAction}
        currentThemePreference={session.user.themePreference}
      />

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">{tNotif("sectionTitle")}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{tNotif("sectionDescription")}</p>
        <div className="mt-3">
          <NotificationToggle />
        </div>
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">{t("googleCalendarTitle")}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("googleCalendarDescription")}</p>
        <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)]">
          <p>
            {t("googleCalendarStatusLabel")}{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {googleCalendarConnection ? t("googleCalendarStatusConnected") : t("googleCalendarStatusNotConnected")}
            </span>
          </p>
          {googleCalendarConnection?.googleEmail ? (
            <p>
              {t("googleCalendarConnectedAs")}{" "}
              <span className="font-medium text-[var(--text-primary)]">{googleCalendarConnection.googleEmail}</span>
            </p>
          ) : null}
          {googleCalendarConnection?.lastSyncedAt ? (
            <p>
              {t("googleCalendarLastSynced")}{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {dateFormatter.format(googleCalendarConnection.lastSyncedAt)}
              </span>
            </p>
          ) : null}
          {googleCalendarConnection?.selectedCalendarName ? (
            <p>
              {t("googleCalendarSource")}{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {googleCalendarConnection.selectedCalendarName}
              </span>
            </p>
          ) : null}
        </div>
        {googleCalendarStatusMessage ? (
          <p className="mt-3 text-xs font-medium text-[var(--accent-sage-text)]">{googleCalendarStatusMessage}</p>
        ) : null}
        {googleCalendarConnection?.lastSyncError ? (
          <p className="mt-2 text-xs font-medium text-[var(--accent-rose-text)]">
            {t("googleCalendarLastError", { message: googleCalendarConnection.lastSyncError })}
          </p>
        ) : null}
        {googleOAuthConfigured ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {googleCalendarConnection ? (
              <>
                <form action={syncGoogleCalendarAction}>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-xs font-semibold text-[var(--accent-sage-text)] transition hover:bg-[var(--accent-sage-soft)]"
                    type="submit"
                  >
                    {t("googleCalendarSyncNow")}
                  </button>
                </form>
                <form action={disconnectGoogleCalendarAction}>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-3 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)]"
                    type="submit"
                  >
                    {t("googleCalendarDisconnect")}
                  </button>
                </form>
              </>
            ) : (
              <form action="/api/google-calendar/connect" method="get">
                <button
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-xs font-semibold text-[var(--accent-sage-text)] transition hover:bg-[var(--accent-sage-soft)]"
                  type="submit"
                >
                  {t("googleCalendarConnect")}
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-[var(--accent-rose-text)]">
            {t("googleCalendarErrorNotConfigured")}
          </p>
        )}
      </section>

      <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--text-strong)]">{t("signedInAs")}</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
          {session.user.name ?? session.user.email ?? t("unknownUser")}
        </p>
        {session.user.name && session.user.email ? (
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{session.user.email}</p>
        ) : null}
      </section>

      {billingSubscription ? (
        <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-strong)]">{t("subscriptionTitle")}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-xs font-semibold text-[var(--accent-sage-text)]">
                  {t(statusKeys[billingSubscription.status] as Parameters<typeof t>[0])}
                </span>
                {billingSubscription.scheduledCancellationAt ? (
                  <span className="inline-flex h-7 items-center rounded-full border border-[var(--accent-sun-border)] bg-[var(--accent-sun-surface)] px-3 text-xs font-semibold text-[var(--accent-sun-text)]">
                    {t("endsDate", { date: formatDate(billingSubscription.scheduledCancellationAt) ?? "" })}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)]">
                <p>
                  {t("nextPayment")}{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {billingSubscription.scheduledCancellationAt
                      ? t("noFurtherPayment")
                      : formatDate(nextPaymentDate) ?? t("notAvailable")}
                  </span>
                </p>
                {accessEndsDate ? (
                  <p>
                    {t("accessUntil")}{" "}
                    <span className="font-medium text-[var(--text-primary)]">{formatDate(accessEndsDate)}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {billingSubscription.status !== BillingSubscriptionStatus.CANCELED &&
            !billingSubscription.scheduledCancellationAt ? (
              <form action={cancelSubscriptionAction}>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-4 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)] sm:h-9 sm:w-auto"
                  type="submit"
                >
                  {t("cancelAfterBilling")}
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-[var(--text-subtle)]">
            {t("cancelNote")}
          </p>
        </section>
      ) : null}

      <section className="rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <h2 className="text-sm font-semibold text-[var(--accent-rose-text)]">{t("deleteTitle")}</h2>
        {isOwnerWithMembers ? (
          <>
            <p className="mt-1 text-xs leading-5 text-[var(--accent-rose-text)]">
              {t("ownerWithMembersNote")}
            </p>
            <Link
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--accent-rose-strong)] bg-[var(--accent-rose-surface)] px-4 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-soft)] sm:h-9 sm:w-auto"
              href="/app/household"
            >
              {t("goToHouseholdSettings")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-[var(--accent-rose-text)]">
              {membership?.role === "OWNER" ? t("deleteOwnerNote") : t("deleteMemberNote")}
            </p>
            {errorMessage ? (
              <p className="mt-3 text-xs font-medium text-[var(--accent-rose-text)]">{errorMessage}</p>
            ) : null}
            <form action={deleteAccountAction} className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--accent-rose-text)]">
                <input
                  className="mt-0.5 shrink-0 accent-[var(--accent-rose-strong)]"
                  name="confirm"
                  required
                  type="checkbox"
                  value="yes"
                />
                {t("confirmCheckbox")}
              </label>
              <div>
                <button
                  className="h-11 w-full rounded-md border border-[var(--accent-rose-strong)] bg-[var(--accent-rose-surface)] px-4 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-soft)] sm:h-9 sm:w-auto"
                  type="submit"
                >
                  {t("deleteButton")}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
