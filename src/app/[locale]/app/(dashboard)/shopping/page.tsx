import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ShoppingBoard } from "@/components/shopping/shopping-board";
import { getCurrentShoppingScope, listAllShoppingListsWithItems } from "@/lib/shopping-lists";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shoppingPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function ShoppingPage() {
  const scope = await getCurrentShoppingScope();
  const initialLists = scope ? await listAllShoppingListsWithItems(scope) : [];

  return <ShoppingBoard initialLists={initialLists} />;
}
