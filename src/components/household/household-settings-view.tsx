import type { HouseholdRole } from "@prisma/client";
import { getTranslations } from "next-intl/server";

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
  renameHouseholdAction: (formData: FormData) => Promise<void>;
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

export async function HouseholdSettingsView({
  householdName,
  members,
  pendingInvites,
  currentMemberId,
  isOwner,
  renameHouseholdAction,
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
  const t = await getTranslations("householdPage");
  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 sm:p-5">
        <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
          {t("label")}
        </p>
        <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
              {householdName}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#686e6a]">
              {t("renameDescription")}
            </p>
          </div>
          {isOwner ? (
            <form action={renameHouseholdAction} className="grid w-full gap-2 sm:w-auto sm:min-w-[20rem]">
              <label className="grid gap-2 text-sm font-semibold text-[#3c413e]">
                {t("renameLabel")}
                <input
                  autoComplete="organization"
                  className="h-11 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-base font-medium text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white sm:text-sm"
                  defaultValue={householdName}
                  maxLength={120}
                  name="name"
                  required
                />
              </label>
              <button
                className="h-11 w-full rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-sm font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] sm:w-auto"
                type="submit"
              >
                {t("renameButton")}
              </button>
            </form>
          ) : null}
        </div>
      </section>

      {successMessage ? (
        <p className="text-sm font-medium text-[#2e6641]">{successMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm font-medium text-[#a6543c]">{errorMessage}</p>
      ) : null}

      {/* Members */}
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#3c413e]">{t("peopleTitle")}</h2>
          </div>
          {isOwner ? (
            <AddHouseholdMemberDialog
              buttonClassName="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] sm:h-9 sm:w-auto"
              buttonLabel={t("addButton")}
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
              label={t("label")}
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
        <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[#a6543c]">{t("deleteTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
            {t("deleteDescription")}
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
              {t("deleteConfirmLabel")}
            </label>
            <div>
              <button
                className="h-11 w-full rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8] sm:h-9 sm:w-auto"
                type="submit"
              >
                {t("deleteButton")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-md border border-[#e8b4a8] bg-[#fff8f6] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[#a6543c]">{t("leaveTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-[#6b3a2d]">
            {t("leaveDescription")}
          </p>
          <form action={leaveHouseholdAction} className="mt-4">
            <button
              className="h-11 w-full rounded-md border border-[#c85b45] bg-[#fff0ec] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fde0d8] sm:h-9 sm:w-auto"
              type="submit"
            >
              {t("leaveButton")}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
