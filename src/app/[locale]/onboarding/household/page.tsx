import { Prisma } from "@prisma/client";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { redirect } from "@/i18n/server";
import { requireAppSession } from "@/lib/authz";
import { hasAccess } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { getFirstHouseholdMembership } from "@/lib/users";

type HouseholdOnboardingPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

const householdNameSchema = z.string().trim().min(1).max(120);

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function createHouseholdAction(formData: FormData) {
  "use server";

  const session = await requireAppSession();
  const rawName = formData.get("name");
  const parsedName = householdNameSchema.safeParse(typeof rawName === "string" ? rawName : "");

  if (!parsedName.success) {
    return await redirect("/onboarding/household?error=name");
  }
  const billingSubscription = session.user.developmentAccessGrantedAt
    ? null
    : await prisma.billingSubscription.findUnique({
        select: { id: true, status: true },
        where: { userId: session.user.id },
      });

  if (
    !hasAccess({
      billingSubscription,
      developmentAccessGrantedAt: session.user.developmentAccessGrantedAt,
      trialStartedAt: session.user.trialStartedAt,
    })
  ) {
    return await redirect("/trial-ended");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Remove any stale memberships pointing to soft-deleted households so the
      // unique accountId constraint doesn't block the new insert.
      await tx.householdMember.deleteMany({
        where: { accountId: session.user.id, household: { deletedAt: { not: null } } },
      });

      const existingMembership = await tx.householdMember.findFirst({
        select: { id: true },
        where: { accountId: session.user.id, household: { deletedAt: null } },
      });

      if (existingMembership) {
        return false;
      }

      const household = await tx.household.create({
        data: { name: parsedName.data },
        select: { id: true },
      });

      if (billingSubscription?.id) {
        await tx.billingSubscription.update({
          data: { householdId: household.id },
          where: { id: billingSubscription.id },
        });
      }

      await tx.householdMember.create({
        data: {
          accountId: session.user.id,
          createdByUserId: session.user.id,
          householdId: household.id,
          name: session.user.name ?? session.user.email ?? "Household member",
          role: "OWNER",
        },
      });

      return true;
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return await redirect("/app");
}

export default async function HouseholdOnboardingPage({
  searchParams,
}: HouseholdOnboardingPageProps) {
  const session = await requireAppSession();
  const existingMembership = await getFirstHouseholdMembership(session.user.id);
  const billingSubscription = session.user.developmentAccessGrantedAt
    ? null
    : await prisma.billingSubscription.findUnique({
        select: { status: true, trialEndsAt: true },
        where: { userId: session.user.id },
      });
  const hasBillingAccess = hasAccess({
    billingSubscription,
    developmentAccessGrantedAt: session.user.developmentAccessGrantedAt,
    trialStartedAt: session.user.trialStartedAt,
  });

  if (existingMembership) {
    return await redirect("/app");
  }

  if (!hasBillingAccess) {
    return await redirect("/trial-ended");
  }

  const params = (await searchParams) ?? {};
  const hasNameError = stringParam(params.error) === "name";

  return <HouseholdOnboardingView hasNameError={hasNameError} />;
}

function HouseholdOnboardingView({ hasNameError }: { hasNameError: boolean }) {
  const t = useTranslations("onboarding");
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[860px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            {t("householdLabel")}
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.9fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                {t("householdTitle")}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                {t("householdDescription")}
              </p>
            </div>
            <form action={createHouseholdAction} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                {t("householdNameLabel")}
                <input
                  autoComplete="organization"
                  className="h-12 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                  maxLength={120}
                  name="name"
                  placeholder={t("householdNamePlaceholder")}
                  required
                />
              </label>
              {hasNameError ? (
                <p className="text-sm font-medium text-[#a6543c]">
                  {t("householdNameError")}
                </p>
              ) : null}
              <button
                className="h-12 rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
                type="submit"
              >
                {t("householdCreateButton")}
              </button>
              <p className="text-center text-xs text-[#9ea49f]">
                {t("householdTrialNote")}
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
