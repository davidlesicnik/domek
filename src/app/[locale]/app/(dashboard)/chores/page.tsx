import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ChoreBoard } from "@/components/chores/chore-board";
import { getCurrentChoreScope, listChoreCategories, listChoreMembers, listChores } from "@/lib/chores";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("choresPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

type ChoresPageProps = Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function ChoresPage({ searchParams }: ChoresPageProps) {
  const scope = await getCurrentChoreScope();
  const params = (await searchParams) ?? {};
  const create = Array.isArray(params.create) ? params.create[0] : params.create;
  const edit = Array.isArray(params.edit) ? params.edit[0] : params.edit;

  const [initialChores, members, categories] = scope
    ? await Promise.all([listChores(scope), listChoreMembers(scope), listChoreCategories(scope)])
    : [[], [], []];

  return (
    <ChoreBoard
      autoOpenCreate={create === "1"}
      autoOpenEditId={edit ?? null}
      categories={categories}
      initialChores={initialChores}
      members={members}
    />
  );
}
