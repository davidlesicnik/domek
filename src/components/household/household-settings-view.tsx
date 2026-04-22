import type { HouseholdRole } from "@prisma/client";

import { AddHouseholdMemberDialog } from "@/components/household/add-household-member-dialog";
import { HouseholdMemberRow } from "@/components/household/household-member-row";
import type {
  HouseholdActionState,
  UpdateHouseholdMemberResult,
} from "@/lib/actions/household-members";

type Member = {
  id: string;
  role: HouseholdRole;
  color: string;
  emoji: string | null;
  name: string;
  accountId: string | null;
  accountEmail: string | null;
  createdAt: Date;
};

type PendingInvite = {
  id: string;
  email: string;
  expiresAt: Date;
};

type HouseholdSettingsViewProps = Readonly<{
  householdName: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  currentMemberId: string;
  isOwner: boolean;
  createMemberAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  sendInviteAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  linkAccountAction: (
    prevState: HouseholdActionState,
    formData: FormData,
  ) => Promise<HouseholdActionState>;
  revokeInviteAction: (formData: FormData) => Promise<void>;
  removeMemberAction: (formData: FormData) => Promise<void>;
  transferOwnershipAction: (formData: FormData) => Promise<void>;
  updateMemberAction: (formData: FormData) => Promise<UpdateHouseholdMemberResult>;
  deleteHouseholdAction: (formData: FormData) => Promise<void>;
  leaveHouseholdAction: () => Promise<void>;
  successMessage: string | null;
  errorMessage: string | null;
}>;

export function HouseholdSettingsView({
  householdName,
  members,
  pendingInvites,
  currentMemberId,
  isOwner,
  createMemberAction,
  sendInviteAction,
  linkAccountAction,
  revokeInviteAction,
  removeMemberAction,
  transferOwnershipAction,
  updateMemberAction,
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

      {successMessage ? (
        <p className="text-sm font-medium text-[#2e6641]">{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm font-medium text-[#a6543c]">{errorMessage}</p>
      ) : null}

      {/* Members */}
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#3c413e]">People in your home</h2>
            <p className="mt-1 text-xs leading-5 text-[#7b827d]">
              Everyone on the board lives here, whether they sign in or not.
            </p>
          </div>
          {isOwner ? (
            <AddHouseholdMemberDialog
              buttonClassName="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
              buttonLabel="Add"
              createMemberAction={createMemberAction}
              pendingInvites={pendingInvites}
              revokeInviteAction={revokeInviteAction}
              sendInviteAction={sendInviteAction}
            />
          ) : null}
        </div>
        <ul className="mt-3 divide-y divide-[#eee9df]">
          {members.map((m) => (
            <HouseholdMemberRow
              currentMemberId={currentMemberId}
              isOwner={isOwner}
              key={m.id}
              linkAccountAction={linkAccountAction}
              member={m}
              removeMemberAction={removeMemberAction}
              transferOwnershipAction={transferOwnershipAction}
              updateMemberAction={updateMemberAction}
            />
          ))}
        </ul>
      </section>

      {/* Danger zone */}
      {isOwner ? (
        <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-5">
          <h2 className="text-sm font-semibold text-[#a6543c]">Delete household</h2>
          <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
            This will permanently delete all household data including todos, chores, shopping lists,
            notes, calendar events, and expenses. All members will lose access.
          </p>
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
