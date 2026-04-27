"use client";

import { useTranslations } from "next-intl";

import { ListBoard } from "@/components/list-board/list-board";
import type { ShoppingListView } from "@/lib/shopping-lists";

type ShoppingBoardProps = Readonly<{
  initialLists: ShoppingListView[];
}>;

export function ShoppingBoard({ initialLists }: ShoppingBoardProps) {
  const t = useTranslations("shoppingPage");
  return (
    <ListBoard
      analyticsArea="shopping"
      initialLists={initialLists}
      itemsPath="/api/shopping/items"
      listsPath="/api/shopping/lists"
      title={t("title")}
    />
  );
}
