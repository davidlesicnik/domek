import { redirect } from "@/i18n/server";

export default async function TrialEndedPage() {
  return await redirect("/app");
}
