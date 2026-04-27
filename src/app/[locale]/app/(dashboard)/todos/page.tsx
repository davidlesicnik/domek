import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TodoBoard } from "@/components/todos/todo-board";
import { getCurrentTodoScope, listAllTodoListsWithItems, listTodoMembers } from "@/lib/todo-lists";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("todoPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

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
