import type { Metadata } from "next";

import { TodoBoard } from "@/components/todos/todo-board";
import { getCurrentTodoScope, listAllTodoListsWithItems, listTodoMembers } from "@/lib/todo-lists";

export const metadata: Metadata = {
  title: "To-do | Domek",
  description: "Shared todo lists for your household.",
};

export default async function TodosPage() {
  const scope = await getCurrentTodoScope();
  const initialLists = scope ? await listAllTodoListsWithItems(scope) : [];
  const members = scope ? await listTodoMembers(scope) : [];

  return <TodoBoard initialLists={initialLists} members={members} />;
}
