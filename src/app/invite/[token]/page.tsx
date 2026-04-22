import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentAppSession } from "@/lib/authz";
import { getInvitePreview, redeemInvite } from "@/lib/invites";
import { hasHouseholdMembership } from "@/lib/users";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata: Metadata = {
  title: "Invite | Domek",
};

type InvitePageProps = Readonly<{
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function acceptInviteAction(token: string) {
  "use server";

  const session = await getCurrentAppSession();
  if (!session) redirect(`/login?next=/invite/${token}`);

  let result;
  try {
    result = await redeemInvite({ token, userId: session.user.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/invite/${token}?error=already_member`);
    }
    throw error;
  }

  if (!result.ok) {
    redirect(`/invite/${token}?error=${result.reason}`);
  }

  redirect("/app");
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};
  const [session, preview] = await Promise.all([
    getCurrentAppSession(),
    getInvitePreview(token),
  ]);

  const errorParam = stringParam(sp.error);

  if (!preview || preview.status === "REVOKED" || preview.household.deletedAt) {
    return <InviteErrorPage reason="not_found" />;
  }

  if (preview.status === "ACCEPTED") {
    return <InviteErrorPage reason="already_used" />;
  }

  if (preview.expiresAt < new Date()) {
    return <InviteErrorPage reason="expired" />;
  }

  const householdName = preview.household.name;
  const inviterName = preview.invitedBy.name ?? "Someone";

  if (!session) {
    return (
      <InviteSignInPage householdName={householdName} inviterName={inviterName} token={token} />
    );
  }

  const alreadyMember = await hasHouseholdMembership(session.user.id);
  if (alreadyMember || errorParam === "already_member") {
    return <InviteErrorPage reason="already_member" />;
  }

  const boundAction = acceptInviteAction.bind(null, token);

  return (
    <InviteAcceptPage
      householdName={householdName}
      inviterName={inviterName}
      acceptAction={boundAction}
      errorReason={errorParam}
    />
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] px-4 py-8 text-[#202321] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[500px] items-center">
        <section className="w-full rounded-md border border-[#dedbd2] bg-[#fffdf8] p-6 shadow-[0_22px_55px_rgba(31,35,30,0.10)] sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}

function InviteSignInPage({
  householdName,
  inviterName,
  token,
}: {
  householdName: string;
  inviterName: string;
  token: string;
}) {
  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        Household invite
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        Join {householdName}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">
        {inviterName} invited you to join this household on Domek. Sign in to accept.
      </p>
      <div className="mt-6">
        <OAuthButtons nextPath={`/invite/${token}`} />
      </div>
    </PageShell>
  );
}

function InviteAcceptPage({
  householdName,
  inviterName,
  acceptAction,
  errorReason,
}: {
  householdName: string;
  inviterName: string;
  acceptAction: () => Promise<void>;
  errorReason: string | null;
}) {
  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        Household invite
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        Join {householdName}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">
        {inviterName} invited you to join this household. Once you accept, you will have access to
        the shared home board.
      </p>
      {errorReason && errorReason !== "already_member" ? (
        <p className="mt-4 text-sm font-medium text-[#a6543c]">
          {errorReason === "expired"
            ? "This invite has expired. Ask the household owner to send a new one."
            : errorReason === "email_mismatch"
              ? "Sign in with the email address that received this invite."
              : "This invite is no longer valid."}
        </p>
      ) : null}
      <form action={acceptAction} className="mt-6">
        <button
          className="h-12 w-full rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
          type="submit"
        >
          Join {householdName}
        </button>
      </form>
    </PageShell>
  );
}

function InviteErrorPage({
  reason,
}: {
  reason: "not_found" | "expired" | "already_used" | "already_member" | "email_mismatch";
}) {
  const messages: Record<typeof reason, { heading: string; body: string }> = {
    not_found: {
      heading: "Invite not found",
      body: "This invite link is invalid or has been removed.",
    },
    expired: {
      heading: "Invite expired",
      body: "This invite link has expired. Ask the household owner to send a new one.",
    },
    already_used: {
      heading: "Invite already used",
      body: "This invite has already been accepted.",
    },
    already_member: {
      heading: "Already in a household",
      body: "You are already a member of a household. Each person can only belong to one household.",
    },
    email_mismatch: {
      heading: "Use the invited email",
      body: "Sign in with the email address that received this invite, or ask for a new invite.",
    },
  };

  const { heading, body } = messages[reason];

  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        Household invite
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        {heading}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">{body}</p>
      {reason === "already_member" ? (
        <div className="mt-6">
          <a
            className="text-sm font-medium text-[#3c413e] underline underline-offset-2 hover:text-[#171a18]"
            href="/app"
          >
            Go to your home board
          </a>
        </div>
      ) : null}
    </PageShell>
  );
}
