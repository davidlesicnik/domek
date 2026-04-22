"use client";

import { useState } from "react";

import { AddHouseholdMemberDialog } from "@/components/household/add-household-member-dialog";
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
  isOwner,
  members,
  pendingInvites,
  revokeInviteAction,
  sendInviteAction,
}: HouseholdHeaderControlsProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[#e2dfd8] bg-[#f4f1ea] px-2 py-1.5">
      {members.map((member) => (
        <HouseholdMemberAvatar key={member.id} member={member} />
      ))}
      {isOwner ? (
        <AddHouseholdMemberDialog
          buttonClassName="flex h-8 items-center gap-1.5 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
          buttonLabel="Add"
          createMemberAction={createMemberAction}
          pendingInvites={pendingInvites}
          revokeInviteAction={revokeInviteAction}
          sendInviteAction={sendInviteAction}
        />
      ) : null}
    </div>
  );
}
