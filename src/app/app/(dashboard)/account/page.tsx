import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getFirstHouseholdMembership } from "@/lib/users";

export const metadata: Metadata = {
  title: "Account | Domek",
};

async function deleteAccountAction(formData: FormData) {
  "use server";

  const confirm = formData.get("confirm");
  if (confirm !== "yes") redirect("/app/account?error=confirm");

  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

  if (membership?.role === "OWNER") {
    const memberCount = await prisma.householdMember.count({
      where: { householdId: membership.householdId },
    });
    if (memberCount > 1) redirect("/app/account?error=owner_with_members");
    // Sole owner: clear members and soft-delete the household
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

  // Soft-delete the user
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      deletedAt: new Date(),
      developmentAccessGrantedAt: null,
    },
  });

  // Sign out
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}

type AccountPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireAppSession();
  const membership = await getFirstHouseholdMembership(session.user.id);

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
      ? "Please check the confirmation box."
      : errorParam === "owner_with_members"
        ? "Delete or transfer your household before deleting your account."
        : null;

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
          Settings
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
          Account
        </h1>
      </div>

      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <h2 className="text-sm font-semibold text-[#3c413e]">Signed in as</h2>
        <p className="mt-2 text-sm font-semibold text-[#202321]">
          {session.user.name ?? session.user.email ?? "Unknown"}
        </p>
        {session.user.name && session.user.email ? (
          <p className="mt-0.5 text-xs text-[#686e6a]">{session.user.email}</p>
        ) : null}
      </section>

      <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-5">
        <h2 className="text-sm font-semibold text-[#a6543c]">Delete account</h2>
        {isOwnerWithMembers ? (
          <>
            <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
              You are the owner of a household with other members. Delete the household first before
              deleting your account.
            </p>
            <a
              className="mt-3 inline-flex h-9 items-center rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
              href="/app/household"
            >
              Go to household settings
            </a>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
              {membership?.role === "OWNER"
                ? "This will deactivate your account and your household."
                : "This will deactivate your account."}
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
                I understand my account will be deactivated
              </label>
              <div>
                <button
                  className="h-9 rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
                  type="submit"
                >
                  Delete account
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
