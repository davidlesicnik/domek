import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

type PaymentOnboardingPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

const developmentCode = "domekappdevelopment";

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function unlockDevelopmentAccessAction(formData: FormData) {
  "use server";

  const session = await requireAppSession();
  const rawCode = formData.get("discountCode");
  const discountCode = typeof rawCode === "string" ? rawCode.trim() : "";

  if (discountCode !== developmentCode) {
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

  if (existingMembership) {
    redirect("/app");
  }

  if (session.user.developmentAccessGrantedAt) {
    redirect("/onboarding/household");
  }

  const params = (await searchParams) ?? {};
  const hasCodeError = stringParam(params.error) === "code";

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[900px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            Domek access
          </p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[0.9fr_1fr] lg:items-stretch">
            <div className="flex flex-col">
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                Set up your household plan
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                Add payment details to continue to your home board setup.
              </p>
              <a
                className="mt-6 inline-flex h-12 w-fit items-center justify-center rounded-md border border-[#d9d6ce] bg-[#fffdf8] px-5 text-sm font-semibold text-[#3c413e] transition hover:border-[#bfc9bd] hover:bg-[#f8f6f1] lg:mt-auto"
                href="/api/auth/signout"
              >
                Nevermind, log out
              </a>
            </div>
            <form action={unlockDevelopmentAccessAction} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                  Card number
                  <input
                    autoComplete="cc-number"
                    className="h-12 rounded-md border border-[#d9d6ce] bg-[#fbfaf6] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                    inputMode="numeric"
                    name="cardNumber"
                    placeholder="4242 4242 4242 4242"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                  Name on card
                  <input
                    autoComplete="cc-name"
                    className="h-12 rounded-md border border-[#d9d6ce] bg-[#fbfaf6] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                    name="cardName"
                    placeholder="Home keeper"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_0.8fr]">
                <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                  Expiry
                  <input
                    autoComplete="cc-exp"
                    className="h-12 rounded-md border border-[#d9d6ce] bg-[#fbfaf6] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                    name="expiry"
                    placeholder="04 / 28"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                  CVC
                  <input
                    autoComplete="cc-csc"
                    className="h-12 rounded-md border border-[#d9d6ce] bg-[#fbfaf6] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                    inputMode="numeric"
                    name="cvc"
                    placeholder="123"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                Discount code
                <input
                  autoComplete="off"
                  className="h-12 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                  name="discountCode"
                  placeholder="Enter code"
                />
              </label>
              {hasCodeError ? (
                <p className="text-sm font-medium text-[#a6543c]">
                  That code could not be applied.
                </p>
              ) : null}
              <button
                className="h-12 rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
                type="submit"
              >
                Continue
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
