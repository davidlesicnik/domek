"use client";

import type { HouseholdRole } from "@prisma/client";
import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";

import { MemberColorPicker } from "@/components/household/member-color-picker";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { UpdateHouseholdMemberResult } from "@/lib/actions/household-members";
import { getMemberColor, type MemberColorKey } from "@/lib/member-colors";
import { getHouseholdMemberName, getHouseholdMemberSubtitle } from "@/lib/household-members";

type HouseholdMemberRowProps = Readonly<{
  member: {
    id: string;
    role: HouseholdRole;
    color: string;
    emoji: string | null;
    name: string;
    accountId: string | null;
    accountEmail: string | null;
  };
  currentMemberId: string;
  isOwner: boolean;
  removeMemberAction: (formData: FormData) => Promise<void>;
  transferOwnershipAction: (formData: FormData) => Promise<void>;
  updateMemberAction: (formData: FormData) => Promise<UpdateHouseholdMemberResult>;
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
  updateMemberAction,
}: HouseholdMemberRowProps) {
  const [selectedColor, setSelectedColor] = useState(getMemberColor(member.color).key);
  const [selectedEmoji, setSelectedEmoji] = useState(member.emoji);
  const [draftName, setDraftName] = useState(member.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canEdit = isOwner || currentMemberId === member.id;
  const memberLabel = getHouseholdMemberName({
    accountEmail: member.accountEmail,
    name: member.name,
  });
  const subtitle = getHouseholdMemberSubtitle({
    accountEmail: member.accountEmail,
    name: member.name,
  });

  function saveName() {
    const formData = new FormData();
    formData.set("memberId", member.id);
    formData.set("name", draftName);

    setError(null);
    startTransition(() => {
      void updateMemberAction(formData).then((result) => {
        if (!result.success) {
          setError(result.error);
          return;
        }

        setIsEditingName(false);
      });
    });
  }

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {canEdit ? (
        <MemberColorPicker
          memberEmail={member.accountEmail}
          memberId={member.id}
          memberLabel={memberLabel}
          memberName={member.name}
          onSelectedColorChange={(color: MemberColorKey) => setSelectedColor(color)}
          onSelectedEmojiChange={setSelectedEmoji}
          selectedEmoji={selectedEmoji}
          selectedColor={selectedColor}
          showOnboardingHint={currentMemberId === member.id}
          storageKey={AVATAR_ONBOARDING_KEY}
          updateMemberAction={updateMemberAction}
        />
      ) : (
        <span className="pt-0.5">
          <MemberAvatar
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border text-base font-semibold transition-colors"
            color={selectedColor}
            email={member.accountEmail}
            emoji={selectedEmoji}
            fallbackLabel="Unknown"
            name={member.name}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="h-9 min-w-0 flex-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                  maxLength={120}
                  onChange={(event) => setDraftName(event.target.value)}
                  value={draftName}
                />
                <button
                  className="h-9 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:bg-[#eef7ef] disabled:opacity-50"
                  disabled={isPending}
                  onClick={saveName}
                  type="button"
                >
                  Save
                </button>
                <button
                  className="h-9 rounded-md px-2 text-xs font-semibold text-[#7c847f] transition hover:text-[#202321]"
                  onClick={() => {
                    setDraftName(member.name);
                    setError(null);
                    setIsEditingName(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[15px] font-semibold leading-5 text-[#171a18]">
                  {memberLabel}
                </p>
                {canEdit ? (
                  <button
                    aria-label={`Edit ${memberLabel}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#7a817c] transition hover:bg-[#f4f1ea] hover:text-[#202321]"
                    onClick={() => {
                      setDraftName(member.name);
                      setError(null);
                      setIsEditingName(true);
                    }}
                    type="button"
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {subtitle ? (
                <p className="truncate text-xs font-normal leading-5 text-[#8a928c]">{subtitle}</p>
              ) : null}
              {!member.accountId ? (
                <span className="inline-flex items-center rounded border border-[#e5e0d6] bg-[#f7f4ed] px-2 py-0.5 text-[11px] font-medium text-[#7b807b]">
                  No account
                </span>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs font-medium text-[#a6543c]">{error}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RolePill role={member.role} />
            {isOwner && member.role === "MEMBER" ? (
              <>
                {member.accountId ? (
                  <form action={transferOwnershipAction}>
                    <input name="memberId" type="hidden" value={member.id} />
                    <button
                      className="h-8 rounded-md border border-[#e2e7df] bg-transparent px-3 text-xs font-semibold text-[#59615c] transition hover:border-[#cfd9cf] hover:bg-[#f4f8f3] hover:text-[#202321]"
                      type="submit"
                    >
                      Make owner
                    </button>
                  </form>
                ) : null}
                <form action={removeMemberAction}>
                  <input name="memberId" type="hidden" value={member.id} />
                  <button
                    className="h-8 rounded-md border border-[#efd0c8] px-3 text-xs font-semibold text-[#b46a58] transition hover:border-[#e4b7ad] hover:bg-[#fff8f6] hover:text-[#9d4f3f]"
                    type="submit"
                  >
                    Remove
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
