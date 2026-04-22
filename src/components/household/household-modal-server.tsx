import { revokeTopBarInviteAction, sendTopBarInviteAction } from "@/lib/actions/household-invite";
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
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    isOwner ? listPendingInvites(membership.householdId) : Promise.resolve([]),
  ]);

  return (
    <HouseholdHeaderControls
      isOwner={isOwner}
      members={members}
      pendingInvites={pendingInvites}
      revokeInviteAction={revokeTopBarInviteAction}
      sendInviteAction={sendTopBarInviteAction}
    />
  );
}
