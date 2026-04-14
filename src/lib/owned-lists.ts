import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasAuthRuntimeConfig } from "@/lib/env";

export type OwnedListScope<Create extends object, Where extends object> = Readonly<{
  create: Create;
  where: Where;
}>;

export type OwnedItemView = { id: string; text: string; done: boolean };
export type OwnedListView = { id: string; name: string; items: OwnedItemView[] };

type OwnedListRecord = Readonly<{
  id: string;
  name: string;
  items: OwnedItemView[];
}>;

type OwnedListDelegate = {
  findMany(args: { orderBy: { createdAt: "asc" }; select: unknown; where: object }): Promise<OwnedListRecord[]>;
  create(args: { data: object; select: unknown }): Promise<OwnedListRecord>;
  deleteMany(args: { where: object }): Promise<{ count: number }>;
  findFirst(args: { select: { id: true }; where: object }): Promise<{ id: string } | null>;
};

type OwnedItemDelegate = {
  create(args: { data: object; select: typeof ownedItemSelect }): Promise<OwnedItemView>;
  findFirst(args: { select: { id: true; done: true }; where: object }): Promise<{ id: string; done: boolean } | null>;
  update(args: { data: { done: boolean }; select: typeof ownedItemSelect; where: { id: string } }): Promise<OwnedItemView>;
  deleteMany(args: { where: object }): Promise<{ count: number }>;
};

type OwnedListOperationsConfig = Readonly<{
  itemListIdField: string;
  items: unknown;
  lists: unknown;
  listWithItemsSelect: unknown;
}>;

export const ownedListInputSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
export const ownedItemInputSchema = z.object({ text: z.string().trim().min(1).max(500) }).strict();
export const ownedItemSelect = { id: true, text: true, done: true } as const;

export function toOwnedListView(list: OwnedListRecord): OwnedListView {
  return {
    id: list.id,
    name: list.name,
    items: list.items.map((item) => ({ id: item.id, text: item.text, done: item.done })),
  };
}

export function parseOwnedListInput(input: unknown): { name: string } {
  return ownedListInputSchema.parse(input);
}

export function parseOwnedItemInput(input: unknown): { text: string } {
  return ownedItemInputSchema.parse(input);
}

export async function getCurrentOwnedListScope<Create extends object, Where extends object>(): Promise<
  OwnedListScope<Create, Where> | null
> {
  if (!hasAuthRuntimeConfig()) {
    return {
      create: {} as Create,
      where: { createdByUserId: null, householdId: null } as Where,
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
  const create = { createdByUserId: user.id, ...(householdId ? { householdId } : {}) } as Create;
  const where = (householdId ? { householdId } : { createdByUserId: user.id, householdId: null }) as Where;

  return { create, where };
}

export function wasDeleted(result: { count: number }): boolean {
  return result.count > 0;
}

export function createOwnedListOperations<Create extends object, Where extends object>({
  itemListIdField,
  items,
  lists,
  listWithItemsSelect,
}: OwnedListOperationsConfig) {
  type Scope = OwnedListScope<Create, Where>;
  const itemDelegate = items as OwnedItemDelegate;
  const listDelegate = lists as OwnedListDelegate;

  return {
    async createItem(listId: string, text: string, scope: Scope): Promise<OwnedItemView | null> {
      const list = await listDelegate.findFirst({
        select: { id: true },
        where: { id: listId, ...scope.where },
      });

      if (!list) {
        return null;
      }

      return itemDelegate.create({
        data: { text, [itemListIdField]: listId },
        select: ownedItemSelect,
      });
    },

    async createList(name: string, scope: Scope): Promise<OwnedListView> {
      const list = await listDelegate.create({
        data: { ...scope.create, name },
        select: listWithItemsSelect,
      });

      return toOwnedListView(list);
    },

    async deleteItem(itemId: string, scope: Scope): Promise<boolean> {
      const result = await itemDelegate.deleteMany({
        where: { id: itemId, list: scope.where },
      });

      return wasDeleted(result);
    },

    async deleteList(id: string, scope: Scope): Promise<boolean> {
      const result = await listDelegate.deleteMany({
        where: { id, ...scope.where },
      });

      return wasDeleted(result);
    },

    async listAll(scope: Scope): Promise<OwnedListView[]> {
      const ownedLists = await listDelegate.findMany({
        orderBy: { createdAt: "asc" },
        select: listWithItemsSelect,
        where: scope.where,
      });

      return ownedLists.map(toOwnedListView);
    },

    async toggleItem(itemId: string, scope: Scope): Promise<OwnedItemView | null> {
      const item = await itemDelegate.findFirst({
        select: { id: true, done: true },
        where: { id: itemId, list: scope.where },
      });

      if (!item) {
        return null;
      }

      return itemDelegate.update({
        data: { done: !item.done },
        select: ownedItemSelect,
        where: { id: itemId },
      });
    },
  };
}
