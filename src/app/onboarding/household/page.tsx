import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAppSession } from "@/lib/authz";
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
    redirect("/onboarding/household?error=name");
  }

  let created = false;

  try {
    created = await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.householdMember.findUnique({
        select: { id: true },
        where: { userId: session.user.id },
      });

      if (existingMembership) {
        return false;
      }

      const household = await tx.household.create({
        data: { name: parsedName.data },
        select: { id: true },
      });

      await tx.householdMember.create({
        data: {
          householdId: household.id,
          role: "OWNER",
          userId: session.user.id,
        },
      });

      return true;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      created = false;
    } else {
      throw error;
    }
  }

  if (!created) {
    redirect("/");
  }

  redirect("/");
}

export default async function HouseholdOnboardingPage({
  searchParams,
}: HouseholdOnboardingPageProps) {
  const session = await requireAppSession();
  const existingMembership = await getFirstHouseholdMembership(session.user.id);

  if (existingMembership) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const hasNameError = stringParam(params.error) === "name";

  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[860px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
            First household
          </p>
          <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_0.9fr] sm:items-start">
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-normal text-[#171a18]">
                Name the home board
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#686e6a]">
                This is the shared household space for lists, notes, dates, and
                everyday money.
              </p>
            </div>
            <form action={createHouseholdAction} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                Household name
                <input
                  autoComplete="organization"
                  className="h-12 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                  maxLength={120}
                  name="name"
                  placeholder="Home"
                  required
                />
              </label>
              {hasNameError ? (
                <p className="text-sm font-medium text-[#a6543c]">
                  Add a household name before continuing.
                </p>
              ) : null}
              <button
                className="h-12 rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
                type="submit"
              >
                Create household
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
