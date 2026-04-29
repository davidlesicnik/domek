"use client";

import { ChevronDown, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AddHouseholdMemberDialog } from "@/components/household/add-household-member-dialog";
import { Link } from "@/i18n/navigation";
import { MemberAvatar as UiMemberAvatar } from "@/components/ui/member-avatar";
import type {
  HouseholdActionState,
} from "@/lib/actions/household-members";
import { getHouseholdMemberName } from "@/lib/household-members";

type Member = Readonly<{
  accountEmail: string | null;
  color: string;
  emoji: string | null;
  id: string;
  name: string;
}>;

type PendingInvite = Readonly<{
  email: string;
  expiresAt: Date;
  id: string;
}>;

type HouseholdHeaderControlsProps = Readonly<{
  createMemberAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  householdName: string;
  isOwner: boolean;
  members: Member[];
  pendingInvites: PendingInvite[];
  revokeInviteAction: (formData: FormData) => Promise<void>;
  sendInviteAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
}>;

function HouseholdMemberAvatar({ member }: { member: Member }) {
  const title = getHouseholdMemberName({
    accountEmail: member.accountEmail,
    name: member.name,
  });
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <UiMemberAvatar
        className="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-md border text-sm font-semibold"
        color={member.color}
        email={member.accountEmail}
        emoji={member.emoji}
        name={member.name}
        onMouseEnter={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom });
        }}
        onMouseLeave={() => setTooltip(null)}
        title={title}
      />
      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded border border-[#d8d2c8] bg-[#fffdf8] px-2 py-1 text-xs text-[#2a2e2b] shadow-sm"
          style={{ left: tooltip.x, top: tooltip.y + 6 }}
        >
          {title}
        </div>
      ) : null}
    </>
  );
}

export function HouseholdHeaderControls({
  createMemberAction,
  householdName,
  isOwner,
  members,
  pendingInvites,
  revokeInviteAction,
  sendInviteAction,
}: HouseholdHeaderControlsProps) {
  const t = useTranslations("householdPage");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <div className="hidden items-center gap-1.5 rounded-md border border-[#e2dfd8] bg-[#f4f1ea] px-2 py-1.5 sm:flex">
        {members.map((member) => (
          <HouseholdMemberAvatar key={member.id} member={member} />
        ))}
        {isOwner ? (
          <AddHouseholdMemberDialog
            buttonClassName="flex h-8 items-center gap-1.5 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
            buttonLabel={t("addButton")}
            createMemberAction={createMemberAction}
            pendingInvites={pendingInvites}
            revokeInviteAction={revokeInviteAction}
            sendInviteAction={sendInviteAction}
          />
        ) : null}
      </div>

      <div className="relative sm:hidden">
        <button
          aria-expanded={isMobileOpen}
          aria-label={t("mobileHeaderMenu")}
          className="inline-flex h-11 max-w-[8.8rem] items-center gap-1.5 rounded-md border border-[#d8d2c8] bg-[#fffdf8] px-2.5 text-sm font-medium text-[#202321] transition hover:bg-[#f7f4ec]"
          onClick={() => setIsMobileOpen((current) => !current)}
          type="button"
        >
          <span className="truncate">{householdName}</span>
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 text-[#6d746f] transition-transform ${isMobileOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isMobileOpen ? (
          <>
            <button
              aria-label={t("closeMobileHeaderMenu")}
              className="fixed inset-0 z-40"
              onClick={() => setIsMobileOpen(false)}
              type="button"
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-md border border-[#dedbd2] bg-[#fffdf8] p-2.5 shadow-[0_18px_45px_rgba(31,35,30,0.16)]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-normal text-[#8b918c]">
                  {t("mobileMembersTitle")}
                </p>
                <div className="-space-x-1 mt-1.5 flex flex-wrap items-center">
                  {members.map((member) => (
                    <div className="relative inline-flex" key={member.id}>
                      <HouseholdMemberAvatar member={member} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 grid gap-1.5 border-t border-[#eee9df] pt-2.5">
                {isOwner ? (
                  <AddHouseholdMemberDialog
                    buttonClassName="inline-flex h-9 items-center justify-center rounded-md border border-[#bfd0c1] bg-[#eef6ef] px-3 text-sm font-medium text-[#2f4e35] transition hover:border-[#9ab59d] hover:bg-[#e2f0e4]"
                    buttonLabel={t("mobileInviteMember")}
                    createMemberAction={createMemberAction}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        setIsMobileOpen(false);
                      }
                    }}
                    pendingInvites={pendingInvites}
                    revokeInviteAction={revokeInviteAction}
                    sendInviteAction={sendInviteAction}
                  />
                ) : null}
                <Link
                  className="inline-flex h-8 items-center justify-between rounded-md px-2.5 text-sm font-medium text-[#5d635f] transition hover:bg-[#f7f4ec] hover:text-[#202321]"
                  href="/app/household"
                  onClick={() => setIsMobileOpen(false)}
                  prefetch={true}
                >
                  <span>{t("mobileHouseholdSettings")}</span>
                  <Settings aria-hidden className="h-3.5 w-3.5 text-[#6d746f]" />
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
