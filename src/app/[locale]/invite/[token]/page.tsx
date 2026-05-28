import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";

import { SignInOptions } from "@/components/auth/sign-in-options";
import { InviteAppOpenBridge } from "@/components/invite/invite-app-open-bridge";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/server";
import { getCurrentAppSession } from "@/lib/authz";
import { getInvitePreview, redeemInvite } from "@/lib/invites";
import { hasHouseholdMembership } from "@/lib/users";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invite" });
  return { title: t("metaTitle") };
}

type InvitePageProps = Readonly<{
  params: Promise<{ locale: string; token: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function acceptInviteAction(token: string) {
  "use server";

  const session = await getCurrentAppSession();
  if (!session) return await redirect(`/login?next=/invite/${token}`);

  let result;
  try {
    result = await redeemInvite({ token, userId: session.user.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return await redirect(`/invite/${token}?error=already_member`);
    }
    throw error;
  }

  if (!result.ok) {
    return await redirect(`/invite/${token}?error=${result.reason}`);
  }

  return await redirect("/app");
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { locale, token } = await params;
  const sp = (await searchParams) ?? {};
  const [session, preview] = await Promise.all([
    getCurrentAppSession(),
    getInvitePreview(token),
  ]);

  const errorParam = stringParam(sp.error);
  const shouldOpenApp = stringParam(sp.openApp) === "1";

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
      <InviteSignInPage
        householdName={householdName}
        inviterName={inviterName}
        locale={locale}
        shouldOpenApp={shouldOpenApp}
        token={token}
      />
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
      locale={locale}
      shouldOpenApp={shouldOpenApp}
      token={token}
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
  locale,
  shouldOpenApp,
  token,
}: {
  householdName: string;
  inviterName: string;
  locale: string;
  shouldOpenApp: boolean;
  token: string;
}) {
  const t = useTranslations("invite");
  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        {t("label")}
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        {t("join", { householdName })}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">
        {t("signInDescription", { inviterName })}
      </p>
      {shouldOpenApp ? (
        <InviteAppOpenBridge locale={locale} token={token} />
      ) : null}
      <div className="mt-6">
        <SignInOptions locale={locale} nextPath={`/invite/${token}`} />
      </div>
    </PageShell>
  );
}

function InviteAcceptPage({
  householdName,
  inviterName,
  acceptAction,
  errorReason,
  locale,
  shouldOpenApp,
  token,
}: {
  householdName: string;
  inviterName: string;
  acceptAction: () => Promise<void>;
  errorReason: string | null;
  locale: string;
  shouldOpenApp: boolean;
  token: string;
}) {
  const t = useTranslations("invite");
  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        {t("label")}
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        {t("join", { householdName })}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">
        {t("acceptDescription", { inviterName })}
      </p>
      {shouldOpenApp ? (
        <InviteAppOpenBridge locale={locale} token={token} />
      ) : null}
      {errorReason && errorReason !== "already_member" ? (
        <p className="mt-4 text-sm font-medium text-[#a6543c]">
          {errorReason === "expired"
            ? t("inlineErrorExpired")
            : errorReason === "email_mismatch"
              ? t("inlineErrorEmailMismatch")
              : t("inlineErrorGeneric")}
        </p>
      ) : null}
      <form action={acceptAction} className="mt-6">
        <button
          className="h-12 w-full rounded-md bg-[#232323] px-5 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
          type="submit"
        >
          {t("joinButton", { householdName })}
        </button>
      </form>
    </PageShell>
  );
}

function InviteErrorPage({
  reason,
}: {
  reason:
    | "not_found"
    | "expired"
    | "already_used"
    | "already_member"
    | "email_mismatch";
}) {
  const t = useTranslations("invite");

  const headingKey = {
    not_found: "notFoundHeading",
    expired: "expiredHeading",
    already_used: "alreadyUsedHeading",
    already_member: "alreadyMemberHeading",
    email_mismatch: "emailMismatchHeading",
  } as const;

  const bodyKey = {
    not_found: "notFoundBody",
    expired: "expiredBody",
    already_used: "alreadyUsedBody",
    already_member: "alreadyMemberBody",
    email_mismatch: "emailMismatchBody",
  } as const;

  return (
    <PageShell>
      <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
        {t("label")}
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
        {t(headingKey[reason])}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#686e6a]">
        {t(bodyKey[reason])}
      </p>
      {reason === "already_member" ? (
        <div className="mt-6">
          <Link
            className="text-sm font-medium text-[#3c413e] underline underline-offset-2 hover:text-[#171a18]"
            href="/app"
          >
            {t("goToHomeBoard")}
          </Link>
        </div>
      ) : null}
    </PageShell>
  );
}
