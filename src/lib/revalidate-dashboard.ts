import { revalidatePath } from "next/cache";

export function revalidateDashboard() {
  revalidatePath("/app");
}
