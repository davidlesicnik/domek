import { redirect } from "@/i18n/server";

export default async function PaymentOnboardingPage() {
  return await redirect("/onboarding/household");
}
