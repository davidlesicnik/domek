import type { Metadata } from "next";

import { TodoBoard } from "@/components/todos/todo-board";
import { getCurrentTodoScope, listAllTodoListsWithItems } from "@/lib/todo-lists";

export const metadata: Metadata = {
  title: "To-do | Domek",
  description: "Shared todo lists for your household.",
};

export default async function TodosPage() {
  const scope = await getCurrentTodoScope();
  const initialLists = scope ? await listAllTodoListsWithItems(scope) : [];

  return <TodoBoard initialLists={initialLists} />;
}
