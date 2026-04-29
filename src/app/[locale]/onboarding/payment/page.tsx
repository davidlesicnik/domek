import { useTranslations } from "next-intl";

import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher";
import { billingStatusHasAccess, getUserBillingSubscription } from "@/lib/billing";
import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import {
  getAppRuntimeConfig,
  getDevelopmentAccessBypassConfig,
  getPaddleRuntimeConfig,
} from "@/lib/env";
import { redirect } from "@/i18n/server";
import { Link } from "@/i18n/navigation";

type PaymentOnboardingPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function unlockDevelopmentAccessAction(formData: FormData) {
  "use server";

  const session = await requireAppSession();
  const developmentAccessBypass = getDevelopmentAccessBypassConfig();
  const rawCode = formData.get("accessCode");
  const accessCode = typeof rawCode === "string" ? rawCode.trim() : "";

  if (
    !developmentAccessBypass.enabled ||
    !developmentAccessBypass.accessCode ||
    accessCode !== developmentAccessBypass.accessCode
  ) {
    return await redirect("/onboarding/payment?error=code");
  }

  await prisma.user.update({
    data: { developmentAccessGrantedAt: new Date() },
    where: { id: session.user.id },
  });

  return await redirect("/onboarding/household");
}

export default async function PaymentOnboardingPage({
  searchParams,
}: PaymentOnboardingPageProps) {
  const session = await requireAppSession();
  const existingMembership = await prisma.householdMember.findFirst({
    select: {
      household: { select: { billingSubscription: { select: { status: true } } } },
      householdId: true,
      id: true,
      role: true,
    },
    where: { accountId: session.user.id, household: { deletedAt: null } },
  });
  const billingSubscription = await getUserBillingSubscription(session.user.id);
  const membershipHasAccess =
    !!existingMembership &&
    billingStatusHasAccess(existingMembership.household.billingSubscription?.status);

  if (existingMembership && membershipHasAccess) {
    return await redirect("/app");
  }

  if (
    !existingMembership &&
    (session.user.developmentAccessGrantedAt ||
      billingStatusHasAccess(billingSubscription?.status))
  ) {
    return await redirect("/onboarding/household");
  }

  const { appUrl } = getAppRuntimeConfig();
  const { clientToken, priceId } = getPaddleRuntimeConfig();
  const developmentAccessBypass = getDevelopmentAccessBypassConfig();
  const origin = appUrl ?? "http://localhost:3000";
  const successUrl = `${origin}/onboarding/payment/success`;
  const params = (await searchParams) ?? {};
  const hasCodeError = stringParam(params.error) === "code";

  return (
    <PaymentOnboardingView
      appUserId={session.user.id}
      clientToken={clientToken}
      customerEmail={session.user.email}
      priceId={priceId}
      successUrl={successUrl}
      showDevelopmentAccessBypass={developmentAccessBypass.enabled}
      hasCodeError={hasCodeError}
    />
  );
}

function PaymentOnboardingView({
  appUserId,
  clientToken,
  customerEmail,
  priceId,
  successUrl,
  showDevelopmentAccessBypass,
  hasCodeError,
}: {
  appUserId: string;
  clientToken: string;
  customerEmail: string | null;
  priceId: string;
  successUrl: string;
  showDevelopmentAccessBypass: boolean;
  hasCodeError: boolean;
}) {
  const t = useTranslations("onboarding");
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[960px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#526c56]">
            {t("paymentLabel")}
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.92fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                {t("paymentTitle")}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                {t("paymentDescription")}
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-[#686e6a]">
                {[t("paymentBullet1"), t("paymentBullet2"), t("paymentBullet3")].map((bullet) => (
                  <li key={bullet} className="flex items-center gap-3">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 rounded-md border border-[#e5e0d7] bg-[#fcfbf7] p-5">
              <div>
                <p className="text-sm font-semibold text-[#202321]">{t("paymentPlanTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-[#686e6a]">
                  {t("paymentPlanDescription")}
                </p>
              </div>

              <div className="rounded-md border border-[#dce6db] bg-[#f3f8f2] p-4">
                <p className="font-serif text-3xl font-semibold text-[#171a18]">{t("paymentPrice")}</p>
                <p className="mt-1 text-sm text-[#526c56]">{t("paymentTrialLabel")}</p>
              </div>

              <PaddleCheckoutLauncher
                appUserId={appUserId}
                clientToken={clientToken}
                customerEmail={customerEmail}
                priceId={priceId}
                successUrl={successUrl}
              />

              <p className="text-xs leading-5 text-[#8b918c]">
                {t("paymentPaddleNote")}
              </p>

              {showDevelopmentAccessBypass ? (
                <div className="border-t border-[#ebe6dd] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[#8b918c]">
                    {t("paymentAccessOption")}
                  </p>
                  <form action={unlockDevelopmentAccessAction} className="mt-3 grid gap-3">
                    <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                      {t("paymentAccessCodeLabel")}
                      <input
                        autoComplete="off"
                        className="h-12 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                        name="accessCode"
                        placeholder={t("paymentAccessCodePlaceholder")}
                      />
                    </label>
                    {hasCodeError ? (
                      <p className="text-sm font-medium text-[#a6543c]">
                        {t("paymentAccessCodeError")}
                      </p>
                    ) : null}
                    <button
                      className="h-11 rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-5 text-sm font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
                      type="submit"
                    >
                      {t("paymentContinueWithCode")}
                    </button>
                  </form>
                </div>
              ) : null}

              <Link
                className="text-center text-xs text-[#9ea49f] underline-offset-2 transition hover:text-[#686e6a] hover:underline"
                href="/pricing"
              >
                {t("paymentViewPricingDetails")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
