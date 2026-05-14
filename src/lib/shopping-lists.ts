import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  createOwnedListOperations,
  getCurrentOwnedListScope,
  ownedItemSelect,
  type OwnedItemView,
  type OwnedListScope,
  type OwnedListView,
} from "@/lib/owned-lists";

export type ShoppingItemView = OwnedItemView;
export type ShoppingListView = OwnedListView;

type ShoppingScope = OwnedListScope<
  Pick<Prisma.ShoppingListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.ShoppingListWhereInput
>;

const shoppingListWithItemsSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: ownedItemSelect,
  },
} satisfies Prisma.ShoppingListSelect;

const shoppingLists = createOwnedListOperations<
  Pick<Prisma.ShoppingListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.ShoppingListWhereInput
>({
  itemListIdField: "shoppingListId",
  items: prisma.shoppingItem,
  lists: prisma.shoppingList,
  listWithItemsSelect: shoppingListWithItemsSelect,
});

export {
  parseOwnedItemInput as parseShoppingItemInput,
  parseOwnedListInput as parseShoppingListInput,
} from "@/lib/owned-lists";

export const getCurrentShoppingScope = getCurrentOwnedListScope<
  Pick<Prisma.ShoppingListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.ShoppingListWhereInput
>;
export const listAllShoppingListsWithItems: (scope: ShoppingScope) => Promise<ShoppingListView[]> =
  shoppingLists.listAll;
export const createShoppingList: (name: string, scope: ShoppingScope) => Promise<ShoppingListView> =
  shoppingLists.createList;
export const updateShoppingList: (id: string, name: string, scope: ShoppingScope) => Promise<ShoppingListView | null> =
  shoppingLists.updateList;
export const deleteShoppingList: (id: string, scope: ShoppingScope) => Promise<boolean> = shoppingLists.deleteList;
export const createShoppingItem: (
  listId: string,
  text: string,
  scope: ShoppingScope,
) => Promise<ShoppingItemView | null> = shoppingLists.createItem;
export const updateShoppingItem: (
  itemId: string,
  text: string,
  scope: ShoppingScope,
) => Promise<ShoppingItemView | null> = shoppingLists.updateItem;
export const toggleShoppingItem: (itemId: string, scope: ShoppingScope) => Promise<ShoppingItemView | null> =
  shoppingLists.toggleItem;
export const deleteShoppingItem: (itemId: string, scope: ShoppingScope) => Promise<boolean> =
  shoppingLists.deleteItem;
