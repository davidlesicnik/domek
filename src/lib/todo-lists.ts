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

export type TodoItemView = OwnedItemView;
export type TodoListView = OwnedListView;

type TodoScope = OwnedListScope<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>;

const todoListWithItemsSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: ownedItemSelect,
  },
} satisfies Prisma.TodoListSelect;

const todoLists = createOwnedListOperations<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>({
  itemListIdField: "todoListId",
  items: prisma.todoItem,
  lists: prisma.todoList,
  listWithItemsSelect: todoListWithItemsSelect,
});

export {
  parseOwnedItemInput as parseTodoItemInput,
  parseOwnedListInput as parseTodoListInput,
} from "@/lib/owned-lists";

export const getCurrentTodoScope = getCurrentOwnedListScope<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>;
export const listAllTodoListsWithItems: (scope: TodoScope) => Promise<TodoListView[]> = todoLists.listAll;
export const createTodoList: (name: string, scope: TodoScope) => Promise<TodoListView> = todoLists.createList;
export const deleteTodoList: (id: string, scope: TodoScope) => Promise<boolean> = todoLists.deleteList;
export const createTodoItem: (listId: string, text: string, scope: TodoScope) => Promise<TodoItemView | null> = todoLists.createItem;
export const toggleTodoItem: (itemId: string, scope: TodoScope) => Promise<TodoItemView | null> = todoLists.toggleItem;
export const deleteTodoItem: (itemId: string, scope: TodoScope) => Promise<boolean> = todoLists.deleteItem;
