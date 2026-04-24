import Link from "next/link";
import { redirect } from "next/navigation";

import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher";
import { billingStatusHasAccess, getUserBillingSubscription } from "@/lib/billing";
import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getAppRuntimeConfig, getPaddleRuntimeConfig } from "@/lib/env";
import { getFirstHouseholdMembership } from "@/lib/users";

const developmentCode = "domekappdevelopment";

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
  const rawCode = formData.get("accessCode");
  const accessCode = typeof rawCode === "string" ? rawCode.trim() : "";

  if (accessCode !== developmentCode) {
    redirect("/onboarding/payment?error=code");
  }

  await prisma.user.update({
    data: { developmentAccessGrantedAt: new Date() },
    where: { id: session.user.id },
  });

  redirect("/onboarding/household");
}

export default async function PaymentOnboardingPage({
  searchParams,
}: PaymentOnboardingPageProps) {
  const session = await requireAppSession();
  const existingMembership = await getFirstHouseholdMembership(session.user.id);
  const billingSubscription = await getUserBillingSubscription(session.user.id);

  if (existingMembership) {
    redirect("/app");
  }

  if (
    session.user.developmentAccessGrantedAt ||
    billingStatusHasAccess(billingSubscription?.status)
  ) {
    redirect("/onboarding/household");
  }

  const { appUrl } = getAppRuntimeConfig();
  const { clientToken, priceId } = getPaddleRuntimeConfig();
  const origin = appUrl ?? "http://localhost:3000";
  const successUrl = `${origin}/onboarding/payment/success`;
  const params = (await searchParams) ?? {};
  const hasCodeError = stringParam(params.error) === "code";

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[960px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#526c56]">
            Trial activation
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.92fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                Start your household with a real trial
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                Domek now starts with Paddle first. Activate the yearly household plan,
                let Paddle hold the 30-day trial, then we&apos;ll send you on to create the
                home board itself.
              </p>
              <ul className="mt-6 grid gap-3 text-sm text-[#686e6a]">
                <li className="flex items-center gap-3">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                  One subscription covers the whole household
                </li>
                <li className="flex items-center gap-3">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                  Trial status comes from Paddle webhooks, not local timers
                </li>
                <li className="flex items-center gap-3">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#b9cdbc]" />
                  Household setup unlocks right after the subscription becomes trialing
                </li>
              </ul>
            </div>

            <div className="grid gap-4 rounded-md border border-[#e5e0d7] bg-[#fcfbf7] p-5">
              <div>
                <p className="text-sm font-semibold text-[#202321]">Domek household plan</p>
                <p className="mt-2 text-sm leading-6 text-[#686e6a]">
                  Yearly billing through Paddle with a 30-day trial. After checkout we&apos;ll
                  wait for the webhook confirmation, then send you straight to household
                  setup.
                </p>
              </div>

              <div className="rounded-md border border-[#dce6db] bg-[#f3f8f2] p-4">
                <p className="font-serif text-3xl font-semibold text-[#171a18]">$15/year</p>
                <p className="mt-1 text-sm text-[#526c56]">30-day trial before the first charge</p>
              </div>

              <PaddleCheckoutLauncher
                appUserId={session.user.id}
                clientToken={clientToken}
                customerEmail={session.user.email}
                priceId={priceId}
                successUrl={successUrl}
              />

              <p className="text-xs leading-5 text-[#8b918c]">
                Paddle handles checkout, taxes, billing, and subscription state. Domek only
                unlocks household setup after Paddle confirms the trial.
              </p>

              <div className="border-t border-[#ebe6dd] pt-4">
                <p className="text-xs font-semibold uppercase tracking-normal text-[#8b918c]">
                  Development bypass
                </p>
                <form action={unlockDevelopmentAccessAction} className="mt-3 grid gap-3">
                  <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                    Access code
                    <input
                      autoComplete="off"
                      className="h-12 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      name="accessCode"
                      placeholder="Enter code"
                    />
                  </label>
                  {hasCodeError ? (
                    <p className="text-sm font-medium text-[#a6543c]">
                      That access code is not valid.
                    </p>
                  ) : null}
                  <button
                    className="h-11 rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-5 text-sm font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1]"
                    type="submit"
                  >
                    Continue without Paddle
                  </button>
                </form>
              </div>

              <Link
                className="text-center text-xs text-[#9ea49f] underline-offset-2 transition hover:text-[#686e6a] hover:underline"
                href="/pricing"
              >
                View pricing details
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
