"use client";

import type { HouseholdRole } from "@prisma/client";
import { Mail, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useRouter } from "@/i18n/navigation";
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
  label: string;
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
  const t = useTranslations("householdPage");
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center rounded border border-[var(--border-default)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
        {t("roleOwner")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-sage-text)]">
      {t("roleMember")}
    </span>
  );
}

export function HouseholdMemberRow({
  member,
  currentMemberId,
  isOwner,
  label,
  linkAccountAction,
  removeMemberAction,
  transferOwnershipAction,
  updateMemberAction,
}: HouseholdMemberRowProps) {
  const t = useTranslations("householdPage");
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
            fallbackLabel={t("unknownMember")}
            name={member.name}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className="h-9 min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--focus-ring)] focus:bg-[var(--input-background)]"
                  maxLength={120}
                  onChange={(event) => setDraftName(event.target.value)}
                  value={draftName}
                />
                <button
                  className="h-9 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-sage-surface)] disabled:opacity-50"
                  disabled={isPending}
                  onClick={saveName}
                  type="button"
                >
                  {t("save")}
                </button>
                <button
                  className="h-9 rounded-md px-2 text-xs font-semibold text-[var(--text-subtle)] transition hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setDraftName(member.name);
                    setError(null);
                    setIsEditingName(false);
                  }}
                  type="button"
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <p className="break-words text-[15px] font-semibold leading-5 text-[var(--text-strong)]">
                  {memberLabel}
                </p>
                {canEdit ? (
                  <button
                    aria-label={t("editMemberAria", { name: memberLabel })}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-subtle)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
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
                <p className="break-words text-xs font-normal leading-5 text-[var(--text-subtle)]">{subtitle}</p>
              ) : null}
              {!member.accountId ? (
                <span className="inline-flex items-center rounded border border-[var(--border-muted)] bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                  {t("noAccount")}
                </span>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs font-medium text-[var(--accent-rose-text)]">{error}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <RolePill role={member.role} />
            {isOwner && member.role === "MEMBER" ? (
              <>
                {member.accountId ? (
                  <form action={transferOwnershipAction}>
                    <input name="memberId" type="hidden" value={member.id} />
                    <button
                      className="h-8 rounded-md border border-[var(--input-border)] bg-transparent px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent-sage-border)] hover:bg-[var(--accent-sage-surface)] hover:text-[var(--text-primary)]"
                      type="submit"
                    >
                      {t("makeOwner")}
                    </button>
                  </form>
                ) : (
                  <LinkAccountDialog
                    linkAccountAction={linkAccountAction}
                    label={label}
                    memberId={member.id}
                    memberLabel={memberLabel}
                  />
                )}
                <form action={removeMemberAction}>
                  <input name="memberId" type="hidden" value={member.id} />
                  <button
                    className="h-8 rounded-md border border-[var(--accent-rose-border)] px-3 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-soft)]"
                    type="submit"
                  >
                    {t("remove")}
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
  label: string;
}>;

function LinkAccountDialog({
  label,
  memberId,
  memberLabel,
  linkAccountAction,
}: LinkAccountDialogProps) {
  const t = useTranslations("householdPage");
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
        className="h-8 rounded-md border border-[var(--input-border)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:border-[var(--accent-sage-border)] hover:bg-[var(--accent-sage-surface)] hover:text-[var(--text-primary)]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {t("linkAccount")}
      </button>
      {isOpen ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={closeDialog}
          />
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
          >
            <div className="w-full max-w-[420px] rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-float)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
                    {label}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
                    {t("linkAccountTitle", { name: memberLabel })}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    {t("linkAccountDescription", { name: memberLabel })}
                  </p>
                </div>
                <button
                  aria-label={t("closeLinkAccountAria", { name: memberLabel })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--input-border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
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
                    className="text-sm font-semibold text-[var(--text-primary)]"
                    htmlFor={`link-account-email-${memberId}`}
                  >
                    {t("emailLabel")}
                  </label>
                  <div className="flex items-center gap-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-3">
                    <Mail aria-hidden className="h-4 w-4 text-[var(--text-subtle)]" />
                    <input
                      autoComplete="email"
                      className="h-11 min-w-0 flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)] sm:text-sm"
                      id={`link-account-email-${memberId}`}
                      maxLength={320}
                      name="email"
                      placeholder="name@example.com"
                      required
                      type="email"
                    />
                  </div>
                </div>
                <p className="text-xs leading-5 text-[var(--text-subtle)]">
                  {t("linkAccountHelp")}
                </p>
                <p className="text-xs leading-5 text-[var(--text-subtle)]">
                  {t("linkAccountNoDuplicate")}
                </p>
                {state.error ? <p className="text-sm font-medium text-[var(--accent-rose-text)]">{state.error}</p> : null}
                <div className="flex justify-end">
                  <button
                    className="inline-flex h-10 items-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)] disabled:opacity-50"
                    disabled={isPending}
                    type="submit"
                  >
                    {t("sendInvite")}
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
