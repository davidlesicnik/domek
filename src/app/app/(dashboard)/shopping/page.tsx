import type { Metadata } from "next";

import { ShoppingBoard } from "@/components/shopping/shopping-board";
import { getCurrentShoppingScope, listAllShoppingListsWithItems } from "@/lib/shopping-lists";

export const metadata: Metadata = {
  title: "Shopping | Domek",
  description: "Shared shopping lists for your household.",
};

export default async function ShoppingPage() {
  const scope = await getCurrentShoppingScope();
  const initialLists = scope ? await listAllShoppingListsWithItems(scope) : [];

  return <ShoppingBoard initialLists={initialLists} />;
}
