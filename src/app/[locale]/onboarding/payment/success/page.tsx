import { redirect } from "@/i18n/server";

export default async function PaymentSuccessPage() {
  return await redirect("/onboarding/household");
}
