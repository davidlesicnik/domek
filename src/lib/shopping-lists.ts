import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasAuthRuntimeConfig } from "@/lib/env";

export type ShoppingItemView = { id: string; text: string; done: boolean };
export type ShoppingListView = { id: string; name: string; items: ShoppingItemView[] };

type ShoppingScope = Readonly<{
  create: Pick<Prisma.ShoppingListUncheckedCreateInput, "createdByUserId" | "householdId">;
  where: Prisma.ShoppingListWhereInput;
}>;

const shoppingListWithItemsSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: { id: true, text: true, done: true },
  },
} satisfies Prisma.ShoppingListSelect;

const shoppingListInputSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
const shoppingItemInputSchema = z.object({ text: z.string().trim().min(1).max(500) }).strict();

export function parseShoppingListInput(input: unknown): { name: string } {
  return shoppingListInputSchema.parse(input);
}

export function parseShoppingItemInput(input: unknown): { text: string } {
  return shoppingItemInputSchema.parse(input);
}

export async function getCurrentShoppingScope(): Promise<ShoppingScope | null> {
  if (!hasAuthRuntimeConfig()) {
    return {
      create: {},
      where: {
        createdByUserId: null,
        householdId: null,
      },
    };
  }

  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    select: {
      id: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        select: { householdId: true },
        take: 1,
      },
    },
    where: { email: session.user.email },
  });

  if (!user) {
    return null;
  }

  const householdId = user.memberships[0]?.householdId;

  if (householdId) {
    return {
      create: { createdByUserId: user.id, householdId },
      where: { householdId },
    };
  }

  return {
    create: { createdByUserId: user.id },
    where: { createdByUserId: user.id, householdId: null },
  };
}

function toShoppingListView(
  list: Prisma.ShoppingListGetPayload<{ select: typeof shoppingListWithItemsSelect }>,
): ShoppingListView {
  return {
    id: list.id,
    name: list.name,
    items: list.items.map((item) => ({ id: item.id, text: item.text, done: item.done })),
  };
}

export async function listAllShoppingListsWithItems(scope: ShoppingScope): Promise<ShoppingListView[]> {
  const lists = await prisma.shoppingList.findMany({
    orderBy: { createdAt: "asc" },
    select: shoppingListWithItemsSelect,
    where: scope.where,
  });

  return lists.map(toShoppingListView);
}

export async function createShoppingList(name: string, scope: ShoppingScope): Promise<ShoppingListView> {
  const list = await prisma.shoppingList.create({
    data: { ...scope.create, name },
    select: shoppingListWithItemsSelect,
  });

  return toShoppingListView(list);
}

export async function deleteShoppingList(id: string, scope: ShoppingScope): Promise<boolean> {
  const result = await prisma.shoppingList.deleteMany({
    where: { id, ...scope.where },
  });

  return result.count > 0;
}

export async function createShoppingItem(
  listId: string,
  text: string,
  scope: ShoppingScope,
): Promise<ShoppingItemView | null> {
  const list = await prisma.shoppingList.findFirst({
    select: { id: true },
    where: { id: listId, ...scope.where },
  });

  if (!list) {
    return null;
  }

  const item = await prisma.shoppingItem.create({
    data: { text, shoppingListId: listId },
    select: { id: true, text: true, done: true },
  });

  return item;
}

export async function toggleShoppingItem(
  itemId: string,
  scope: ShoppingScope,
): Promise<ShoppingItemView | null> {
  const item = await prisma.shoppingItem.findFirst({
    select: { id: true, done: true },
    where: { id: itemId, list: scope.where },
  });

  if (!item) {
    return null;
  }

  const updated = await prisma.shoppingItem.update({
    data: { done: !item.done },
    select: { id: true, text: true, done: true },
    where: { id: itemId },
  });

  return updated;
}

export async function deleteShoppingItem(itemId: string, scope: ShoppingScope): Promise<boolean> {
  const result = await prisma.shoppingItem.deleteMany({
    where: { id: itemId, list: scope.where },
  });

  return result.count > 0;
}
