"use client";

import type { HouseholdRole } from "@prisma/client";
import { useState } from "react";

import { MemberColorPicker } from "@/components/household/member-color-picker";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { getMemberColor, type MemberColorKey } from "@/lib/member-colors";

type HouseholdMemberRowProps = Readonly<{
  member: {
    id: string;
    role: HouseholdRole;
    color: string;
    emoji: string | null;
    user: { name: string | null; email: string | null; image: string | null };
  };
  currentMemberId: string;
  isOwner: boolean;
  removeMemberAction: (formData: FormData) => Promise<void>;
  transferOwnershipAction: (formData: FormData) => Promise<void>;
  updateMemberAvatarAction: (formData: FormData) => Promise<{ error: string | null; success: boolean }>;
}>;

const AVATAR_ONBOARDING_KEY = "domek.household.avatar-picker-seen";

function RolePill({ role }: { role: HouseholdRole }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center rounded border border-[#d9d6ce] bg-[#f2efe8] px-2 py-0.5 text-xs font-semibold text-[#5d625e]">
        Owner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-[#d9ede0] text-[#2e6641]">
      Member
    </span>
  );
}

export function HouseholdMemberRow({
  member,
  currentMemberId,
  isOwner,
  removeMemberAction,
  transferOwnershipAction,
  updateMemberAvatarAction,
}: HouseholdMemberRowProps) {
  const [selectedColor, setSelectedColor] = useState(getMemberColor(member.color).key);
  const [selectedEmoji, setSelectedEmoji] = useState(member.emoji);
  const memberLabel = member.user.name ?? member.user.email ?? "member";

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {isOwner || currentMemberId === member.id ? (
        <MemberColorPicker
          memberEmail={member.user.email}
          memberId={member.id}
          memberLabel={memberLabel}
          memberName={member.user.name}
          onSelectedColorChange={(color: MemberColorKey) => setSelectedColor(color)}
          onSelectedEmojiChange={setSelectedEmoji}
          selectedEmoji={selectedEmoji}
          selectedColor={selectedColor}
          showOnboardingHint={currentMemberId === member.id}
          storageKey={AVATAR_ONBOARDING_KEY}
          updateMemberAvatarAction={updateMemberAvatarAction}
        />
      ) : (
        <span className="pt-0.5">
          <MemberAvatar
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-base font-semibold transition-colors"
            color={selectedColor}
            email={member.user.email}
            emoji={selectedEmoji}
            fallbackLabel="Unknown"
            name={member.user.name}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-[15px] font-semibold leading-5 text-[#171a18]">
            {memberLabel === "member" ? "Unknown" : memberLabel}
          </p>
          <RolePill role={member.role} />
        </div>
        {member.user.name && member.user.email ? (
          <p className="truncate text-xs font-normal leading-5 text-[#8a928c]">{member.user.email}</p>
        ) : null}
      </div>
      {isOwner && member.role === "MEMBER" ? (
        <div className="flex shrink-0 items-center gap-2">
          <form action={transferOwnershipAction}>
            <input name="memberId" type="hidden" value={member.id} />
            <button
              className="h-8 rounded-md border border-[#e2e7df] bg-transparent px-3 text-xs font-semibold text-[#59615c] transition hover:border-[#cfd9cf] hover:bg-[#f4f8f3] hover:text-[#202321]"
              type="submit"
            >
              Make owner
            </button>
          </form>
          <form action={removeMemberAction}>
            <input name="memberId" type="hidden" value={member.id} />
            <button
              className="h-8 rounded-md border border-[#efd0c8] px-3 text-xs font-semibold text-[#b46a58] transition hover:border-[#e4b7ad] hover:bg-[#fff8f6] hover:text-[#9d4f3f]"
              type="submit"
            >
              Remove
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
