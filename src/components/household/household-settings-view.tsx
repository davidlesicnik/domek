import type { HouseholdRole } from "@prisma/client";

import { HouseholdMemberRow } from "@/components/household/household-member-row";

type Member = {
  id: string;
  role: HouseholdRole;
  color: string;
  createdAt: Date;
  user: { name: string | null; email: string | null; image: string | null };
};

type PendingInvite = {
  id: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
};

type HouseholdSettingsViewProps = Readonly<{
  householdName: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  currentMemberId: string;
  isOwner: boolean;
  sendInviteAction: (formData: FormData) => Promise<void>;
  revokeInviteAction: (formData: FormData) => Promise<void>;
  removeMemberAction: (formData: FormData) => Promise<void>;
  transferOwnershipAction: (formData: FormData) => Promise<void>;
  updateMemberColorAction: (formData: FormData) => Promise<void>;
  deleteHouseholdAction: (formData: FormData) => Promise<void>;
  leaveHouseholdAction: () => Promise<void>;
  successMessage: string | null;
  errorMessage: string | null;
}>;

function formatExpiry(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Expired";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

export function HouseholdSettingsView({
  householdName,
  members,
  pendingInvites,
  currentMemberId,
  isOwner,
  sendInviteAction,
  revokeInviteAction,
  removeMemberAction,
  transferOwnershipAction,
  updateMemberColorAction,
  deleteHouseholdAction,
  leaveHouseholdAction,
  successMessage,
  errorMessage,
}: HouseholdSettingsViewProps) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
          Household
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
          {householdName}
        </h1>
      </div>

      {/* Members */}
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <h2 className="text-sm font-semibold text-[#3c413e]">People in your home</h2>
        <ul className="mt-3 divide-y divide-[#eee9df]">
          {members.map((m) => (
            <HouseholdMemberRow
              currentMemberId={currentMemberId}
              isOwner={isOwner}
              key={m.id}
              member={m}
              removeMemberAction={removeMemberAction}
              transferOwnershipAction={transferOwnershipAction}
              updateMemberColorAction={updateMemberColorAction}
            />
          ))}
        </ul>
      </section>

      {/* Invite form — owner only */}
      {isOwner ? (
        <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
          <h2 className="text-sm font-semibold text-[#3c413e]">Invite someone</h2>
          <p className="mt-1 text-xs leading-5 text-[#686e6a]">
            They will receive an email with a link to join this household. Invite links expire after 7
            days.
          </p>
          {successMessage ? (
            <p className="mt-3 text-sm font-medium text-[#2e6641]">{successMessage}</p>
          ) : null}
          {errorMessage ? (
            <p className="mt-3 text-sm font-medium text-[#a6543c]">{errorMessage}</p>
          ) : null}
          <form action={sendInviteAction} className="mt-4 flex gap-2">
            <label className="sr-only" htmlFor="invite-email">
              Email address
            </label>
            <input
              autoComplete="email"
              className="h-10 min-w-0 flex-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
              id="invite-email"
              maxLength={320}
              name="email"
              placeholder="name@example.com"
              required
              type="email"
            />
            <button
              className="h-10 shrink-0 rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e]"
              type="submit"
            >
              Send invite
            </button>
          </form>
        </section>
      ) : null}

      {/* Pending invites — owner only */}
      {isOwner && pendingInvites.length > 0 ? (
        <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
          <h2 className="text-sm font-semibold text-[#3c413e]">Pending invites</h2>
          <ul className="mt-3 grid gap-2">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#202321]">{invite.email}</p>
                  <p className="text-xs text-[#9a9e9b]">{formatExpiry(invite.expiresAt)}</p>
                </div>
                <form action={revokeInviteAction}>
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
        </section>
      ) : null}

      {/* Danger zone */}
      {isOwner ? (
        <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-5">
          <h2 className="text-sm font-semibold text-[#a6543c]">Delete household</h2>
          <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
            This will permanently delete all household data including todos, shopping lists, notes,
            calendar events, and expenses. All members will lose access.
          </p>
          {errorMessage ? (
            <p className="mt-3 text-xs font-medium text-[#a6543c]">{errorMessage}</p>
          ) : null}
          <form action={deleteHouseholdAction} className="mt-4 grid gap-3">
            <label className="flex cursor-pointer items-start gap-2 text-xs text-[#6b3a2d]">
              <input
                className="mt-0.5 shrink-0"
                name="confirm"
                required
                type="checkbox"
                value="yes"
              />
              I understand this will permanently delete the household and all its data
            </label>
            <div>
              <button
                className="h-9 rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
                type="submit"
              >
                Delete household
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-5">
          <h2 className="text-sm font-semibold text-[#a6543c]">Leave household</h2>
          <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
            You will be removed from this household and lose access to all shared data.
          </p>
          <form action={leaveHouseholdAction} className="mt-4">
            <button
              className="h-9 rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8]"
              type="submit"
            >
              Leave household
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
