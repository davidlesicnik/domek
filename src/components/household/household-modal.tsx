"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getMemberColor } from "@/lib/member-colors";
import type { InviteActionState } from "@/lib/actions/household-invite";

type Member = {
  id: string;
  color: string;
  user: { name: string | null; email: string | null };
};

type PendingInvite = {
  id: string;
  email: string;
  expiresAt: Date;
};

type HouseholdHeaderControlsProps = Readonly<{
  members: Member[];
  isOwner: boolean;
  pendingInvites: PendingInvite[];
  sendInviteAction: (
    prevState: InviteActionState,
    formData: FormData,
  ) => Promise<InviteActionState>;
  revokeInviteAction: (formData: FormData) => Promise<void>;
}>;

function MemberAvatar({ member }: { member: Member }) {
  const palette = getMemberColor(member.color);
  const letter = (member.user.name ?? member.user.email ?? "?").slice(0, 1).toUpperCase();
  const title = member.user.name ?? member.user.email ?? "Member";
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <span
        className="flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-md border font-serif text-sm font-semibold"
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom });
        }}
        onMouseLeave={() => setTooltip(null)}
        style={{
          backgroundColor: palette.avatarBg,
          borderColor: palette.border,
          color: palette.avatarText,
        }}
      >
        {letter}
      </span>
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

function formatExpiry(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expired";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function SentenceLines({ text, className }: { text: string; className?: string }) {
  const lines = text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <p className={className}>
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

function InvitePopover({
  pendingInvites,
  sendInviteAction,
  revokeInviteAction,
}: {
  pendingInvites: PendingInvite[];
  sendInviteAction: HouseholdHeaderControlsProps["sendInviteAction"];
  revokeInviteAction: HouseholdHeaderControlsProps["revokeInviteAction"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(sendInviteAction, {
    success: false,
    error: null,
  });
  const [, startRevokeTransition] = useTransition();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  function close() {
    setOpen(false);
  }

  function openFresh() {
    if (state.success) setFormKey((k) => k + 1);
    setOpen(true);
  }

  function handleRevoke(formData: FormData) {
    startRevokeTransition(async () => {
      await revokeInviteAction(formData);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
        onClick={open ? close : openFresh}
        type="button"
      >
        <UserPlus aria-hidden className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Invite</span>
      </button>

      {open ? (
        <>
          <div aria-hidden className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 shadow-[0_18px_45px_rgba(31,35,30,0.16)]">
            {state.success && formKey === 0 ? (
              <div>
                <p className="text-sm font-semibold text-[#2e6641]">Invite sent!</p>
                <p className="mt-1 text-xs text-[#686e6a]">
                  They&apos;ll receive an email with a join link.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="h-8 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:bg-[#eef7ef]"
                    onClick={() => setFormKey((k) => k + 1)}
                    type="button"
                  >
                    Send another
                  </button>
                  <button
                    className="h-8 rounded-md px-3 text-xs font-semibold text-[#686e6a] transition hover:text-[#202321]"
                    onClick={close}
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form action={formAction} key={formKey}>
                <p className="text-xs font-semibold text-[#3c413e]">Invite someone</p>
                <SentenceLines
                  className="mt-1 text-xs leading-5 text-[#686e6a]"
                  text="They'll receive an email link to join. Expires in 7 days."
                />
                {state.error ? (
                  <SentenceLines
                    className="mt-2 text-xs font-medium leading-5 text-[#a6543c]"
                    text={state.error}
                  />
                ) : null}
                <div className="mt-3 flex gap-2">
                  <label className="sr-only" htmlFor="topbar-invite-email">
                    Email address
                  </label>
                  <input
                    autoComplete="email"
                    className="h-8 min-w-0 flex-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
                    id="topbar-invite-email"
                    maxLength={320}
                    name="email"
                    placeholder="name@example.com"
                    required
                    type="email"
                  />
                  <button
                    className="h-8 shrink-0 rounded-md bg-[#232323] px-3 text-xs font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
                    disabled={pending}
                    type="submit"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}

            {pendingInvites.length > 0 ? (
              <div className="mt-4 border-t border-[#eee9df] pt-4">
                <p className="text-xs font-semibold text-[#3c413e]">Pending</p>
                <ul className="mt-2 grid gap-2">
                  {pendingInvites.map((invite) => (
                    <li key={invite.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-[#202321]">
                          {invite.email}
                        </p>
                        <p className="text-xs text-[#9a9e9b]">{formatExpiry(invite.expiresAt)}</p>
                      </div>
                      <form action={handleRevoke}>
                        <input name="inviteId" type="hidden" value={invite.id} />
                        <button
                          className="h-7 rounded-md border border-[#dfb4a8] px-2.5 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fff5f1]"
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
        </>
      ) : null}
    </div>
  );
}

export function HouseholdHeaderControls({
  members,
  isOwner,
  pendingInvites,
  sendInviteAction,
  revokeInviteAction,
}: HouseholdHeaderControlsProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-[#e2dfd8] bg-[#f4f1ea] px-2 py-1.5">
      {members.map((m) => (
        <MemberAvatar key={m.id} member={m} />
      ))}
      {isOwner ? (
        <InvitePopover
          pendingInvites={pendingInvites}
          revokeInviteAction={revokeInviteAction}
          sendInviteAction={sendInviteAction}
        />
      ) : null}
    </div>
  );
}
