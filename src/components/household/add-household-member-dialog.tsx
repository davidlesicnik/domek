"use client";

import { ArrowLeft, Mail, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { MS_PER_DAY, MS_PER_MINUTE } from "@/lib/time-constants";

import { useRouter } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { HouseholdActionState } from "@/lib/actions/household-members";
import { MEMBER_EMOJI_OPTIONS } from "@/lib/member-avatar";
import { MEMBER_COLORS, MEMBER_COLOR_KEYS, type MemberColorKey } from "@/lib/member-colors";

type PendingInvite = Readonly<{
  email: string;
  expiresAt: Date;
  id: string;
}>;

type AddHouseholdMemberDialogProps = Readonly<{
  buttonClassName: string;
  buttonLabel: string;
  createMemberAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  pendingInvites: PendingInvite[];
  revokeInviteAction: (formData: FormData) => Promise<void>;
  sendInviteAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  onOpenChange?: (isOpen: boolean) => void;
}>;

function previewInitial(name: string) {
  const trimmed = name.trim();
  return (trimmed.slice(0, 1) || "H").toUpperCase();
}

export function AddHouseholdMemberDialog({
  buttonClassName,
  buttonLabel,
  createMemberAction,
  onOpenChange,
  pendingInvites,
  revokeInviteAction,
  sendInviteAction,
}: AddHouseholdMemberDialogProps) {
  const t = useTranslations("addMemberDialog");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"invite" | "member" | null>(null);
  const [memberName, setMemberName] = useState("");
  const [selectedColor, setSelectedColor] = useState<MemberColorKey>("green");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [inviteFormKey, setInviteFormKey] = useState(0);
  const [memberFormKey, setMemberFormKey] = useState(0);
  const [inviteState, setInviteState] = useState<HouseholdActionState>({
    error: null,
    success: false,
  });
  const [memberState, setMemberState] = useState<HouseholdActionState>({
    error: null,
    success: false,
  });
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [invitePending, startInviteTransition] = useTransition();
  const [memberPending, startMemberTransition] = useTransition();
  const [, startRevokeTransition] = useTransition();
  const memberInitial = previewInitial(memberName);

  useEffect(() => {
    if (!isOpen) return undefined;

    const intervalId = globalThis.setInterval(() => {
      setCurrentTime(Date.now());
    }, MS_PER_MINUTE);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [isOpen]);

  function openDialog() {
    setCurrentTime(Date.now());
    setIsOpen(true);
    onOpenChange?.(true);
  }

  function formatExpiry(date: Date): string {
    const diff = date.getTime() - currentTime;
    const days = Math.ceil(diff / MS_PER_DAY);

    if (days <= 0) return t("expiryExpired");
    if (days === 1) return t("expiryTomorrow");
    return t("expiryDays", { days });
  }

  function resetDialogState() {
    setMode(null);
    setInviteFormKey((current) => current + 1);
    setMemberFormKey((current) => current + 1);
    setInviteState({ error: null, success: false });
    setMemberState({ error: null, success: false });
    setMemberName("");
    setSelectedColor("green");
    setSelectedEmoji("");
  }

  function closeDialog() {
    setIsOpen(false);
    onOpenChange?.(false);
    resetDialogState();
  }

  function resetAfterSuccess() {
    router.refresh();
    setIsOpen(false);
    onOpenChange?.(false);
    resetDialogState();
  }

  function handleRevoke(formData: FormData) {
    startRevokeTransition(async () => {
      await revokeInviteAction(formData);
      router.refresh();
    });
  }

  function handleInviteSubmit(formData: FormData) {
    startInviteTransition(async () => {
      const result = await sendInviteAction(inviteState, formData);
      setInviteState(result);
      if (result.success) {
        resetAfterSuccess();
      }
    });
  }

  function handleMemberSubmit(formData: FormData) {
    startMemberTransition(async () => {
      const result = await createMemberAction(memberState, formData);
      setMemberState(result);
      if (result.success) {
        resetAfterSuccess();
      }
    });
  }

  return (
    <>
      <button className={buttonClassName} onClick={openDialog} type="button">
        <UserPlus aria-hidden className="h-3.5 w-3.5" />
        <span>{buttonLabel}</span>
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
            <div className="w-full max-w-[520px] rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-float)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
                    {t("label")}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[var(--text-strong)]">
                    {t("title")}
                  </h2>
                  {mode === null ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                      {t("subtitle")}
                    </p>
                  ) : (
                    <button
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
                      onClick={() => setMode(null)}
                      type="button"
                    >
                      <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
                      <span>{t("back")}</span>
                    </button>
                  )}
                </div>
                <button
                  aria-label={t("closeAriaLabel")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--input-border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)]"
                  onClick={closeDialog}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              {mode === null ? (
                <div className="mt-5 grid gap-3">
                  <button
                    className="grid gap-1 rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 py-4 text-left transition hover:bg-[var(--surface-secondary)]"
                    onClick={() => setMode("invite")}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-[var(--text-strong)]">{t("inviteTitle")}</span>
                    <span className="text-sm leading-6 text-[var(--text-muted)]">
                      {t("inviteDescription")}
                    </span>
                  </button>
                  <button
                    className="grid gap-1 rounded-md border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                    onClick={() => setMode("member")}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-[var(--text-strong)]">{t("memberTitle")}</span>
                    <span className="text-sm leading-6 text-[var(--text-muted)]">
                      {t("memberDescription")}
                    </span>
                  </button>
                </div>
              ) : null}

              {mode === "invite" ? (
                <form action={handleInviteSubmit} className="mt-5 grid gap-2.5" key={inviteFormKey}>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[var(--text-primary)]" htmlFor="member-invite-email">
                      {t("emailLabel")}
                    </label>
                    <div className="flex items-center gap-2 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-3">
                      <Mail aria-hidden className="h-4 w-4 text-[var(--text-subtle)]" />
                      <input
                        autoComplete="email"
                      className="h-11 min-w-0 flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--input-placeholder)] sm:text-sm"
                        id="member-invite-email"
                        maxLength={320}
                        name="email"
                        placeholder="name@example.com"
                        required
                        type="email"
                      />
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-[var(--text-subtle)]">
                    {t("inviteHelpText")}
                  </p>
                  {inviteState.error ? (
                    <p className="text-sm font-medium text-[var(--accent-rose-text)]">{inviteState.error}</p>
                  ) : null}
                  <div className="pt-1 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)] disabled:opacity-50"
                      disabled={invitePending}
                      type="submit"
                    >
                      {t("sendInviteButton")}
                    </button>
                  </div>
                </form>
              ) : (
                mode === "member" ? (
                <form action={handleMemberSubmit} className="mt-5 grid gap-4" key={memberFormKey}>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[var(--text-primary)]" htmlFor="member-name">
                      {t("nameLabel")}
                    </label>
                    <input
                      className="h-11 rounded-md border border-[var(--input-border)] bg-[var(--surface-secondary)] px-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--focus-ring)] focus:bg-[var(--input-background)] sm:text-sm"
                      id="member-name"
                      maxLength={120}
                      name="name"
                      onChange={(event) => setMemberName(event.target.value)}
                      placeholder="Mila"
                      required
                    />
                  </div>

                  <div className="grid gap-3 rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] p-4">
                    <div className="grid gap-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t("avatarTitle")}</p>
                      <p className="text-xs leading-5 text-[var(--text-subtle)]">
                        {t("avatarSubtitle")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-md border border-[var(--border-muted)] bg-[var(--input-background)] px-3 py-2.5">
                      <MemberAvatar
                        className="flex h-9 w-9 items-center justify-center rounded-md border text-xs font-semibold"
                        color={selectedColor}
                        emoji={selectedEmoji || null}
                        name={memberName.trim() || t("avatarPlaceholder")}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                          {memberName.trim() || t("avatarPlaceholder")}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                      <div className="grid gap-2">
                        <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">{t("colorLabel")}</p>
                        <input name="color" type="hidden" value={selectedColor} />
                        <div className="grid w-fit grid-cols-[repeat(4,2.75rem)] gap-1.5">
                          {MEMBER_COLOR_KEYS.map((key) => {
                            const color = MEMBER_COLORS[key];
                            const isSelected = key === selectedColor;

                            return (
                              <button
                                aria-label={`Use ${color.name}`}
                                className={`flex h-11 w-11 items-center justify-center rounded-md border transition ${
                                  isSelected ? "shadow-[inset_0_0_0_1px_rgba(32,35,33,0.16)]" : ""
                                }`}
                                key={key}
                                onClick={() => setSelectedColor(key)}
                                style={{
                                  backgroundColor: color.hex,
                                  borderColor: isSelected ? "#202321" : color.border,
                                }}
                                type="button"
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">{t("emojiLabel")}</p>
                        <input name="emoji" type="hidden" value={selectedEmoji} />
                        <div className="grid w-fit grid-cols-[repeat(4,2.75rem)] gap-1.5">
                          {["", ...MEMBER_EMOJI_OPTIONS].map((emoji) => {
                            const isSelected = emoji === selectedEmoji;
                            const label = emoji || t("emojiInitial");

                            return (
                              <button
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-md border text-lg transition ${
                                  isSelected
                                    ? "border-[var(--text-strong)] bg-[var(--surface-secondary)]"
                                    : "border-[var(--input-border)] bg-[var(--input-background)] hover:bg-[var(--surface-secondary)]"
                                }`}
                                key={label}
                                onClick={() => setSelectedEmoji(emoji)}
                                type="button"
                              >
                                <span
                                  className={emoji ? "" : "text-[11px] font-semibold uppercase text-[var(--text-muted)]"}
                                >
                                  {emoji || memberInitial}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {memberState.error ? (
                    <p className="text-sm font-medium text-[var(--accent-rose-text)]">{memberState.error}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      className="inline-flex h-10 items-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)] disabled:opacity-50"
                      disabled={memberPending}
                      type="submit"
                    >
                      {t("addButton")}
                    </button>
                  </div>
                </form>
                ) : null
              )}

              {pendingInvites.length > 0 ? (
                <div className="mt-6 border-t border-[var(--border-muted)] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--text-muted)]">
                    {t("pendingInvitesTitle")}
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {pendingInvites.map((invite) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] px-3 py-2"
                        key={invite.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{invite.email}</p>
                          <p className="text-xs text-[var(--text-subtle)]">{formatExpiry(invite.expiresAt)}</p>
                        </div>
                        <form action={handleRevoke}>
                          <input name="inviteId" type="hidden" value={invite.id} />
                          <button
                            className="h-8 rounded-md border border-[var(--accent-rose-border)] px-3 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-soft)]"
                            type="submit"
                          >
                            {t("revokeButton")}
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
