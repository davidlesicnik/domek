import { getFirstHouseholdMembership } from "@/lib/users";
import { HouseholdModalButton } from "@/components/household/household-modal";

export async function HouseholdModalServer({ userId }: { userId: string }) {
  const membership = await getFirstHouseholdMembership(userId);
  if (!membership) return null;

  return <HouseholdModalButton />;
}
