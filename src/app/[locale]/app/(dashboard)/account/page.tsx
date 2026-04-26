import type { Metadata } from "next";
import { BillingSubscriptionStatus } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getOptionalPaddleServerConfig } from "@/lib/env";
import {
  cancelPaddleSubscriptionAtPeriodEnd,
  cancelPaddleSubscriptionImmediately,
  PaddleSubscriptionCancelError,
} from "@/lib/paddle-server";
import { createSupabaseServerClient } from "@/lib/supabase";
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
  const [session, t, locale] = await Promise.all([
    requireAppSession(),
    getTranslations("accountPage"),
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
              : null;

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
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
          {t("settingsLabel")}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
          {t("title")}
        </h1>
      </div>

      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <h2 className="text-sm font-semibold text-[#3c413e]">{t("signedInAs")}</h2>
        <p className="mt-2 text-sm font-semibold text-[#202321]">
          {session.user.name ?? session.user.email ?? t("unknownUser")}
        </p>
        {session.user.name && session.user.email ? (
          <p className="mt-0.5 text-xs text-[#686e6a]">{session.user.email}</p>
        ) : null}
      </section>

      {billingSubscription ? (
        <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#3c413e]">{t("subscriptionTitle")}</h2>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#526c56]">
                  {t(statusKeys[billingSubscription.status] as Parameters<typeof t>[0])}
                </span>
                {billingSubscription.scheduledCancellationAt ? (
                  <span className="inline-flex h-7 items-center rounded-full border border-[#dfd8c8] bg-[#fbf7ef] px-3 text-xs font-semibold text-[#7b6d49]">
                    {t("endsDate", { date: formatDate(billingSubscription.scheduledCancellationAt) ?? "" })}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-xs text-[#686e6a]">
                <p>
                  {t("nextPayment")}{" "}
                  <span className="font-medium text-[#202321]">
                    {billingSubscription.scheduledCancellationAt
                      ? t("noFurtherPayment")
                      : formatDate(nextPaymentDate) ?? t("notAvailable")}
                  </span>
                </p>
                {accessEndsDate ? (
                  <p>
                    {t("accessUntil")}{" "}
                    <span className="font-medium text-[#202321]">{formatDate(accessEndsDate)}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {billingSubscription.status !== BillingSubscriptionStatus.CANCELED &&
            !billingSubscription.scheduledCancellationAt ? (
              <form action={cancelSubscriptionAction}>
                <button
                  className="inline-flex h-9 items-center rounded-md border border-[#dfb4a8] bg-[#fff5f1] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fbe8df]"
                  type="submit"
                >
                  {t("cancelAfterBilling")}
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#8b918c]">
            {t("cancelNote")}
          </p>
        </section>
      ) : null}

      <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-5">
        <h2 className="text-sm font-semibold text-[#a6543c]">{t("deleteTitle")}</h2>
        {isOwnerWithMembers ? (
          <>
            <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
              {t("ownerWithMembersNote")}
            </p>
            <Link
              className="mt-3 inline-flex h-9 items-center rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
              href="/app/household"
            >
              {t("goToHouseholdSettings")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
              {membership?.role === "OWNER" ? t("deleteOwnerNote") : t("deleteMemberNote")}
            </p>
            {errorMessage ? (
              <p className="mt-3 text-xs font-medium text-[#a6543c]">{errorMessage}</p>
            ) : null}
            <form action={deleteAccountAction} className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start gap-2 text-xs text-[#6b3a2d]">
                <input
                  className="mt-0.5 shrink-0"
                  name="confirm"
                  required
                  type="checkbox"
                  value="yes"
                />
                {t("confirmCheckbox")}
              </label>
              <div>
                <button
                  className="h-9 rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
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
