const TRIAL_DAYS = 30;
const EXPIRING_THRESHOLD_DAYS = 3;
const ACTIVATION_DAYS = 14;

export type TrialState = "active" | "trial" | "expiring" | "expired";

export function getTrialDaysLeft(createdAt: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUsed = (Date.now() - createdAt.getTime()) / msPerDay;
  return Math.ceil(TRIAL_DAYS - daysUsed);
}

export function getTrialDaysUsed(createdAt: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((Date.now() - createdAt.getTime()) / msPerDay);
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
