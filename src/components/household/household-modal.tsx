"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HouseholdRole } from "@prisma/client";
import { Users, X } from "lucide-react";

import {
  sendHouseholdInvite,
  revokeHouseholdInvite,
  type SendInviteState,
} from "@/lib/household-actions";

type Member = {
  id: string;
  role: HouseholdRole;
  user: { name: string | null; email: string | null };
};

type PendingInvite = {
  id: string;
  email: string;
  expiresAt: Date;
};

type HouseholdModalButtonProps = Readonly<{
  householdName: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  isOwner: boolean;
}>;

function formatExpiry(date: Date): string {
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expired";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function MemberInitials({ name, email }: { name: string | null; email: string | null }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#ebe7df] font-serif text-xs text-[#b94e3f]">
      {(name ?? email ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function RolePill({ role }: { role: HouseholdRole }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#232323] text-[#fdfcf8]">
        Owner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#d9ede0] text-[#2e6641]">
      Member
    </span>
  );
}

function InviteForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<SendInviteState, FormData>(
    sendHouseholdInvite,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <div>
      <h3 className="text-xs font-semibold text-[#3c413e]">Invite someone</h3>
      <p className="mt-0.5 text-[11px] leading-4 text-[#9a9e9b]">
        They will receive an email with a link. Expires after 7 days.
      </p>
      {state?.ok ? (
        <p className="mt-2 text-xs font-medium text-[#2e6641]">Invite sent.</p>
      ) : null}
      {state && !state.ok ? (
        <p className="mt-2 text-xs font-medium text-[#a6543c]">
          {state.error === "email"
            ? "Enter a valid email address."
            : state.error === "forbidden"
              ? "Only the owner can send invites."
              : state.error === "already_member"
                ? "That person is already in this household."
                : "Failed to send invite. Try again."}
        </p>
      ) : null}
      <form action={formAction} className="mt-2 flex gap-1.5">
        <label className="sr-only" htmlFor="modal-invite-email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="h-9 min-w-0 flex-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
          id="modal-invite-email"
          maxLength={320}
          name="email"
          placeholder="name@example.com"
          required
          type="email"
        />
        <button
          className="h-9 shrink-0 rounded-md bg-[#232323] px-3 text-xs font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

export function HouseholdModalButton({
  householdName,
  members,
  pendingInvites,
  isOwner,
}: HouseholdModalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [, startRevoke] = useTransition();

  const handleRevoke = (inviteId: string) => {
    startRevoke(async () => {
      await revokeHouseholdInvite(inviteId);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Household"
        className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
          isOpen
            ? "border-[#9ab59d] bg-[#eef7ef] text-[#202321]"
            : "border-[#cfd9cf] bg-[#f8fbf7] text-[#202321] hover:border-[#9ab59d] hover:bg-[#eef7ef]"
        }`}
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <Users aria-hidden className="h-4 w-4" />
        <span className="hidden sm:inline">Household</span>
      </button>

      {isOpen ? (
        <>
          {/* Backdrop for click-outside */}
          <div
            aria-hidden
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel anchored below the button */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-md border border-[#dedbd2] bg-[#fffdf8] shadow-[0_18px_48px_rgba(31,35,30,0.18)]">
            <div className="flex items-center justify-between border-b border-[#e8e5de] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b94e3f]">
                  Household
                </p>
                <p className="text-sm font-semibold text-[#171a18]">{householdName}</p>
              </div>
              <button
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#686e6a] transition hover:bg-[#ebe7df] hover:text-[#202321]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4">
              {/* Members */}
              <div>
                <h3 className="text-xs font-semibold text-[#3c413e]">Members</h3>
                <ul className="mt-2 grid gap-2">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <MemberInitials name={m.user.name} email={m.user.email} />
                      <p className="min-w-0 flex-1 truncate text-xs font-medium text-[#202321]">
                        {m.user.name ?? m.user.email ?? "Unknown"}
                      </p>
                      <RolePill role={m.role} />
                    </li>
                  ))}
                </ul>
              </div>

              {isOwner ? (
                <>
                  <div className="border-t border-[#e8e5de]" />
                  <InviteForm />
                </>
              ) : null}

              {isOwner && pendingInvites.length > 0 ? (
                <>
                  <div className="border-t border-[#e8e5de]" />
                  <div>
                    <h3 className="text-xs font-semibold text-[#3c413e]">Pending invites</h3>
                    <ul className="mt-2 grid gap-2">
                      {pendingInvites.map((invite) => (
                        <li key={invite.id} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#202321]">
                              {invite.email}
                            </p>
                            <p className="text-[11px] text-[#9a9e9b]">
                              {formatExpiry(invite.expiresAt)}
                            </p>
                          </div>
                          <button
                            className="h-7 shrink-0 rounded border border-[#dfb4a8] px-2 text-[11px] font-semibold text-[#a6543c] transition hover:bg-[#fff5f1]"
                            onClick={() => handleRevoke(invite.id)}
                            type="button"
                          >
                            Revoke
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
