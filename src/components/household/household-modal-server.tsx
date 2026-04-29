import {
  createPassiveHouseholdMemberAction,
  revokeHouseholdMemberInviteAction,
  sendHouseholdMemberInviteAction,
} from "@/lib/actions/household-members";
import { prisma } from "@/lib/db";
import { listPendingInvites } from "@/lib/invites";
import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdHeaderControls } from "@/components/household/household-modal";

export async function HouseholdModalServer({ userId }: { userId: string }) {
  const membership = await getFirstHouseholdMembership(userId);
  if (!membership) return null;

  const isOwner = membership.role === "OWNER";

  const [members, pendingInvites] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId: membership.householdId },
      select: {
        id: true,
        color: true,
        emoji: true,
        name: true,
        account: { select: { email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    isOwner ? listPendingInvites(membership.householdId) : Promise.resolve([]),
  ]);

  return (
    <HouseholdHeaderControls
      createMemberAction={createPassiveHouseholdMemberAction}
      householdName={membership.household.name}
      isOwner={isOwner}
      members={members.map((member) => ({
        accountEmail: member.account?.email ?? null,
        color: member.color,
        emoji: member.emoji,
        id: member.id,
        name: member.name,
      }))}
      pendingInvites={pendingInvites}
      revokeInviteAction={revokeHouseholdMemberInviteAction}
      sendInviteAction={sendHouseholdMemberInviteAction}
    />
  );
}
