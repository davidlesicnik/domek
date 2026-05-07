import { MS_PER_DAY } from "@/lib/time-constants";

const TRIAL_DAYS = 30;
const EXPIRING_THRESHOLD_DAYS = 3;
const ACTIVATION_DAYS = 14;

export type TrialState = "active" | "trial" | "expiring" | "expired";

export function getTrialDaysLeft(createdAt: Date): number {
  const daysUsed = (Date.now() - createdAt.getTime()) / MS_PER_DAY;
  return Math.ceil(TRIAL_DAYS - daysUsed);
}

export function getTrialDaysUsed(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / MS_PER_DAY);
}

export function getTrialState(
  householdCreatedAt: Date,
  paidAt: Date | null,
  developmentAccess: boolean,
): TrialState {
  if (paidAt || developmentAccess) return "active";

  const daysLeft = getTrialDaysLeft(householdCreatedAt);

  if (daysLeft > EXPIRING_THRESHOLD_DAYS) return "trial";
  if (daysLeft > 0) return "expiring";
  return "expired";
}

export { ACTIVATION_DAYS };
