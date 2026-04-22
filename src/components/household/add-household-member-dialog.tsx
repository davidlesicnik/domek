"use client";

import { ArrowLeft, Mail, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { MemberAvatar } from "@/components/ui/member-avatar";
import type { HouseholdActionState } from "@/lib/actions/household-members";
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
}>;

const EMOJI_OPTIONS = ["", "🙂", "😄", "🦊", "🐸", "🌻", "🚲", "⚽", "🎨", "🧩"] as const;

function formatExpiry(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Expired";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function previewInitial(name: string) {
  const trimmed = name.trim();
  return (trimmed.slice(0, 1) || "H").toUpperCase();
}

export function AddHouseholdMemberDialog({
  buttonClassName,
  buttonLabel,
  createMemberAction,
  pendingInvites,
  revokeInviteAction,
  sendInviteAction,
}: AddHouseholdMemberDialogProps) {
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
  const [invitePending, startInviteTransition] = useTransition();
  const [memberPending, startMemberTransition] = useTransition();
  const [, startRevokeTransition] = useTransition();
  const memberInitial = previewInitial(memberName);

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
    resetDialogState();
  }

  function resetAfterSuccess() {
    router.refresh();
    setIsOpen(false);
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
      <button className={buttonClassName} onClick={() => setIsOpen(true)} type="button">
        <UserPlus aria-hidden className="h-3.5 w-3.5" />
        <span>{buttonLabel}</span>
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
            <div className="w-full max-w-[520px] rounded-md border border-[#ddd7cc] bg-[#fffdf8] p-5 shadow-[0_24px_60px_rgba(31,35,30,0.18)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
                    Household
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
                    Add someone
                  </h2>
                  {mode === null ? (
                    <p className="mt-2 text-sm leading-6 text-[#686e6a]">
                      How do you want to add them?
                    </p>
                  ) : (
                    <button
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#5f6661] transition hover:text-[#202321]"
                      onClick={() => setMode(null)}
                      type="button"
                    >
                      <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>
                  )}
                </div>
                <button
                  aria-label="Close add person dialog"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#ddd7cc] text-[#5d635f] transition hover:bg-[#f6f2ea]"
                  onClick={closeDialog}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              {mode === null ? (
                <div className="mt-5 grid gap-3">
                  <button
                    className="grid gap-1 rounded-md border border-[#d9ded7] bg-[#f8fbf7] px-4 py-4 text-left transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
                    onClick={() => setMode("invite")}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-[#202321]">Invite by email</span>
                    <span className="text-sm leading-6 text-[#68706a]">
                      Send them a link to join with their own account
                    </span>
                  </button>
                  <button
                    className="grid gap-1 rounded-md border border-[#ddd7cc] bg-[#fbfaf6] px-4 py-4 text-left transition hover:border-[#cfc7b9] hover:bg-[#f6f2ea]"
                    onClick={() => setMode("member")}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-[#202321]">Add child or shared member</span>
                    <span className="text-sm leading-6 text-[#68706a]">
                      Create someone without a login for kids or shared devices
                    </span>
                  </button>
                </div>
              ) : null}

              {mode === "invite" ? (
                <form action={handleInviteSubmit} className="mt-5 grid gap-2.5" key={inviteFormKey}>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[#3c413e]" htmlFor="member-invite-email">
                      Email
                    </label>
                    <div className="flex items-center gap-2 rounded-md border border-[#d6ddd6] bg-[#f8fbf7] px-3">
                      <Mail aria-hidden className="h-4 w-4 text-[#7b827d]" />
                      <input
                        autoComplete="email"
                        className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#202321] outline-none"
                        id="member-invite-email"
                        maxLength={320}
                        name="email"
                        placeholder="name@example.com"
                        required
                        type="email"
                      />
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-[#7a817c]">
                    They&apos;ll receive an email link to join this household. The link expires in 7 days.
                  </p>
                  {inviteState.error ? (
                    <p className="text-sm font-medium text-[#a6543c]">{inviteState.error}</p>
                  ) : null}
                  <div className="pt-1 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                      disabled={invitePending}
                      type="submit"
                    >
                      Send invite
                    </button>
                  </div>
                </form>
              ) : (
                mode === "member" ? (
                <form action={handleMemberSubmit} className="mt-5 grid gap-4" key={memberFormKey}>
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[#3c413e]" htmlFor="member-name">
                      Name
                    </label>
                    <input
                      className="h-11 rounded-md border border-[#d6ddd6] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                      id="member-name"
                      maxLength={120}
                      name="name"
                      onChange={(event) => setMemberName(event.target.value)}
                      placeholder="Mila"
                      required
                    />
                  </div>

                  <div className="grid gap-3 rounded-md border border-[#e6e1d7] bg-[#fbfaf6] p-4">
                    <div className="grid gap-1">
                      <p className="text-sm font-semibold text-[#3c413e]">Avatar</p>
                      <p className="text-xs leading-5 text-[#7a817c]">
                        Choose how they appear on the board
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-md border border-[#e6e1d7] bg-white px-3 py-2.5">
                      <MemberAvatar
                        className="flex h-9 w-9 items-center justify-center rounded-md border text-xs font-semibold"
                        color={selectedColor}
                        emoji={selectedEmoji || null}
                        name={memberName.trim() || "Household member"}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#202321]">
                          {memberName.trim() || "Household member"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <p className="text-xs font-semibold uppercase tracking-normal text-[#5f6661]">Color</p>
                      <input name="color" type="hidden" value={selectedColor} />
                      <div className="flex flex-wrap gap-2">
                        {MEMBER_COLOR_KEYS.map((key) => {
                          const color = MEMBER_COLORS[key];
                          const isSelected = key === selectedColor;

                          return (
                            <button
                              aria-label={`Use ${color.name}`}
                              className={`h-10 w-10 rounded-md border transition ${
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
                      <p className="text-xs font-semibold uppercase tracking-normal text-[#5f6661]">Emoji</p>
                      <input name="emoji" type="hidden" value={selectedEmoji} />
                      <div className="flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((emoji) => {
                          const isSelected = emoji === selectedEmoji;
                          const label = emoji || "Initial";

                          return (
                            <button
                              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-lg transition ${
                                isSelected
                                  ? "border-[#202321] bg-[#f4f1ea]"
                                  : "border-[#d8d2c8] bg-white hover:bg-[#faf8f2]"
                              }`}
                              key={label}
                              onClick={() => setSelectedEmoji(emoji)}
                              type="button"
                            >
                              <span className={emoji ? "" : "text-[11px] font-semibold uppercase text-[#5f6661]"}>
                                {emoji || memberInitial}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {memberState.error ? (
                    <p className="text-sm font-medium text-[#a6543c]">{memberState.error}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      className="inline-flex h-10 items-center rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                      disabled={memberPending}
                      type="submit"
                    >
                      Add to household
                    </button>
                  </div>
                </form>
                ) : null
              )}

              {pendingInvites.length > 0 ? (
                <div className="mt-6 border-t border-[#ece8df] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[#5e655f]">
                    Pending invites
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {pendingInvites.map((invite) => (
                      <li
                        className="flex items-center justify-between gap-3 rounded-md border border-[#ece8df] bg-[#fbfaf6] px-3 py-2"
                        key={invite.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#202321]">{invite.email}</p>
                          <p className="text-xs text-[#8a908c]">{formatExpiry(invite.expiresAt)}</p>
                        </div>
                        <form action={handleRevoke}>
                          <input name="inviteId" type="hidden" value={invite.id} />
                          <button
                            className="h-8 rounded-md border border-[#dfb4a8] px-3 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fff5f1]"
                            type="submit"
                          >
                            Revoke
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
