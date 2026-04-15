import type { HouseholdRole } from "@prisma/client";

type Member = {
  id: string;
  role: HouseholdRole;
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
  isOwner: boolean;
  sendInviteAction: (formData: FormData) => Promise<void>;
  revokeInviteAction: (formData: FormData) => Promise<void>;
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

function MemberInitials({ name, email }: { name: string | null; email: string | null }) {
  const letter = (name ?? email ?? "?").slice(0, 1).toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ebe7df] font-serif text-sm text-[#b94e3f]">
      {letter}
    </span>
  );
}

function RolePill({ role }: { role: HouseholdRole }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-[#232323] text-[#fdfcf8]">
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

export function HouseholdSettingsView({
  householdName,
  members,
  pendingInvites,
  isOwner,
  sendInviteAction,
  revokeInviteAction,
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
        <h2 className="text-sm font-semibold text-[#3c413e]">Members</h2>
        <ul className="mt-3 grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <MemberInitials name={m.user.name} email={m.user.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#202321]">
                  {m.user.name ?? m.user.email ?? "Unknown"}
                </p>
                {m.user.name && m.user.email ? (
                  <p className="truncate text-xs text-[#686e6a]">{m.user.email}</p>
                ) : null}
              </div>
              <RolePill role={m.role} />
            </li>
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
    </div>
  );
}
