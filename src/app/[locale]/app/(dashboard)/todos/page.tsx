import type { Metadata } from "next";

import { TodoBoard } from "@/components/todos/todo-board";
import { getCurrentTodoScope, listAllTodoListsWithItems, listTodoMembers } from "@/lib/todo-lists";

export const metadata: Metadata = {
  title: "To-do | Domek",
  description: "Shared todo lists for your household.",
};

type TodosPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function TodosPage({ searchParams }: TodosPageProps) {
  const scope = await getCurrentTodoScope();
  const initialLists = scope ? await listAllTodoListsWithItems(scope) : [];
  const members = scope ? await listTodoMembers(scope) : [];
  const params = (await searchParams) ?? {};
  const create = Array.isArray(params.create) ? params.create[0] : params.create;

  return <TodoBoard autoOpenComposer={create === "1"} initialLists={initialLists} members={members} />;
}
