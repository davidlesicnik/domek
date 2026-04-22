"use client";

import type { HouseholdRole } from "@prisma/client";
import { Mail, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MemberColorPicker } from "@/components/household/member-color-picker";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type {
  HouseholdActionState,
  UpdateHouseholdMemberResult,
} from "@/lib/actions/household-members";
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
  linkAccountAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
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
  linkAccountAction,
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
                ) : (
                  <LinkAccountDialog
                    linkAccountAction={linkAccountAction}
                    memberId={member.id}
                    memberLabel={memberLabel}
                  />
                )}
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

type LinkAccountDialogProps = Readonly<{
  memberId: string;
  memberLabel: string;
  linkAccountAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
}>;

function LinkAccountDialog({
  memberId,
  memberLabel,
  linkAccountAction,
}: LinkAccountDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, setState] = useState<HouseholdActionState>({ error: null, success: false });
  const [isPending, startTransition] = useTransition();

  function closeDialog() {
    setIsOpen(false);
    setState({ error: null, success: false });
    setFormKey((current) => current + 1);
  }

  function handleSubmit(formData: FormData) {
    formData.set("memberId", memberId);

    startTransition(async () => {
      const result = await linkAccountAction(state, formData);
      setState(result);

      if (result.success) {
        router.refresh();
        closeDialog();
      }
    });
  }

  return (
    <>
      <button
        className="h-8 rounded-md border border-[#d7ddd6] px-3 text-xs font-semibold text-[#59615c] transition hover:border-[#c2cbbf] hover:bg-[#f4f8f3] hover:text-[#202321]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Link account
      </button>
      {isOpen ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-[#202321]/28 backdrop-blur-[1px]"
            onClick={closeDialog}
          />
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
          >
            <div className="w-full max-w-[420px] rounded-md border border-[#ddd7cc] bg-[#fffdf8] p-5 shadow-[0_24px_60px_rgba(31,35,30,0.18)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
                    Household
                  </p>
                  <h3 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
                    Invite {memberLabel} to create an account
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#686e6a]">
                    Send {memberLabel} a link to create an account for this profile.
                  </p>
                </div>
                <button
                  aria-label={`Close link account dialog for ${memberLabel}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ddd7cc] text-[#5d635f] transition hover:bg-[#f6f2ea]"
                  onClick={closeDialog}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              <form action={handleSubmit} className="mt-5 grid gap-2.5" key={formKey}>
                <input name="memberId" type="hidden" value={memberId} />
                <div className="grid gap-2">
                  <label
                    className="text-sm font-semibold text-[#3c413e]"
                    htmlFor={`link-account-email-${memberId}`}
                  >
                    Email
                  </label>
                  <div className="flex items-center gap-2 rounded-md border border-[#d6ddd6] bg-[#f8fbf7] px-3">
                    <Mail aria-hidden className="h-4 w-4 text-[#7b827d]" />
                    <input
                      autoComplete="email"
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#202321] outline-none"
                      id={`link-account-email-${memberId}`}
                      maxLength={320}
                      name="email"
                      placeholder="name@example.com"
                      required
                      type="email"
                    />
                  </div>
                </div>
                <p className="text-xs leading-5 text-[#7a817c]">
                  Once they accept, their account will be linked to this existing profile.
                </p>
                <p className="text-xs leading-5 text-[#7a817c]">
                  This won&apos;t create a duplicate member.
                </p>
                {state.error ? <p className="text-sm font-medium text-[#a6543c]">{state.error}</p> : null}
                <div className="flex justify-end">
                  <button
                    className="inline-flex h-10 items-center rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                    disabled={isPending}
                    type="submit"
                  >
                    Send invite
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
