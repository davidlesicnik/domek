import type { Metadata } from "next";

import { ChoreBoard } from "@/components/chores/chore-board";
import { getCurrentChoreScope, listChoreCategories, listChoreMembers, listChores } from "@/lib/chores";

export const metadata: Metadata = {
  title: "Chores | Domek",
  description: "Track recurring household chores in one shared timeline.",
};

export default async function ChoresPage() {
  const scope = await getCurrentChoreScope();

  const [initialChores, members, categories] = scope
    ? await Promise.all([listChores(scope), listChoreMembers(scope), listChoreCategories(scope)])
    : [[], [], []];

  return <ChoreBoard categories={categories} initialChores={initialChores} members={members} />;
}
