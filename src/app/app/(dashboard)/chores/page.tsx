import type { Metadata } from "next";

import { ChoreBoard } from "@/components/chores/chore-board";
import { getCurrentChoreScope, listChoreMembers, listChores } from "@/lib/chores";

export const metadata: Metadata = {
  title: "Chores | Domek",
  description: "Track recurring household chores in one shared timeline.",
};

export default async function ChoresPage() {
  const scope = await getCurrentChoreScope();

  const [initialChores, members] = scope
    ? await Promise.all([listChores(scope), listChoreMembers(scope)])
    : [[], []];

  return <ChoreBoard initialChores={initialChores} members={members} />;
}
