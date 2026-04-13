import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hasAuthRuntimeConfig } from "@/lib/env";

export type TodoItemView = { id: string; text: string; done: boolean };
export type TodoListView = { id: string; name: string; items: TodoItemView[] };

type TodoScope = Readonly<{
  create: Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">;
  where: Prisma.TodoListWhereInput;
}>;

const todoListWithItemsSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: { id: true, text: true, done: true },
  },
} satisfies Prisma.TodoListSelect;

const todoListInputSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
const todoItemInputSchema = z.object({ text: z.string().trim().min(1).max(500) }).strict();

export function parseTodoListInput(input: unknown): { name: string } {
  return todoListInputSchema.parse(input);
}

export function parseTodoItemInput(input: unknown): { text: string } {
  return todoItemInputSchema.parse(input);
}

export async function getCurrentTodoScope(): Promise<TodoScope | null> {
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

function toTodoListView(
  list: Prisma.TodoListGetPayload<{ select: typeof todoListWithItemsSelect }>,
): TodoListView {
  return {
    id: list.id,
    name: list.name,
    items: list.items.map((item) => ({ id: item.id, text: item.text, done: item.done })),
  };
}

export async function listAllTodoListsWithItems(scope: TodoScope): Promise<TodoListView[]> {
  const lists = await prisma.todoList.findMany({
    orderBy: { createdAt: "asc" },
    select: todoListWithItemsSelect,
    where: scope.where,
  });

  return lists.map(toTodoListView);
}

export async function createTodoList(name: string, scope: TodoScope): Promise<TodoListView> {
  const list = await prisma.todoList.create({
    data: { ...scope.create, name },
    select: todoListWithItemsSelect,
  });

  return toTodoListView(list);
}

export async function deleteTodoList(id: string, scope: TodoScope): Promise<boolean> {
  const result = await prisma.todoList.deleteMany({
    where: { id, ...scope.where },
  });

  return result.count > 0;
}

export async function createTodoItem(
  listId: string,
  text: string,
  scope: TodoScope,
): Promise<TodoItemView | null> {
  const list = await prisma.todoList.findFirst({
    select: { id: true },
    where: { id: listId, ...scope.where },
  });

  if (!list) {
    return null;
  }

  const item = await prisma.todoItem.create({
    data: { text, todoListId: listId },
    select: { id: true, text: true, done: true },
  });

  return item;
}

export async function toggleTodoItem(
  itemId: string,
  scope: TodoScope,
): Promise<TodoItemView | null> {
  const item = await prisma.todoItem.findFirst({
    select: { id: true, done: true },
    where: { id: itemId, list: scope.where },
  });

  if (!item) {
    return null;
  }

  const updated = await prisma.todoItem.update({
    data: { done: !item.done },
    select: { id: true, text: true, done: true },
    where: { id: itemId },
  });

  return updated;
}

export async function deleteTodoItem(itemId: string, scope: TodoScope): Promise<boolean> {
  const result = await prisma.todoItem.deleteMany({
    where: { id: itemId, list: scope.where },
  });

  return result.count > 0;
}
