import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getHouseholdMemberName } from "@/lib/household-members";
import {
  createOwnedListOperations,
  getCurrentOwnedListScope,
  wasDeleted,
  type OwnedListScope,
} from "@/lib/owned-lists";

export type TodoMemberView = Readonly<{
  id: string;
  color: string;
  email: string | null;
  emoji: string | null;
  name: string | null;
}>;

export type TodoItemView = Readonly<{
  assignedHouseholdMemberColor: string | null;
  assignedHouseholdMemberEmail: string | null;
  assignedHouseholdMemberEmoji: string | null;
  assignedHouseholdMemberId: string | null;
  assignedHouseholdMemberName: string | null;
  done: boolean;
  dueDate: string | null;
  id: string;
  text: string;
}>;

export type TodoListView = Readonly<{
  id: string;
  items: TodoItemView[];
  name: string;
}>;

type TodoScope = OwnedListScope<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>;

type TodoItemInput = Readonly<{
  assignedHouseholdMemberId?: string | null;
  dueDate?: string | null;
  text: string;
}>;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const todoItemInputSchema = z
  .object({
    assignedHouseholdMemberId: z.string().cuid().nullable().optional(),
    dueDate: z
      .string()
      .regex(dateKeyPattern)
      .refine(isValidDateKey, "Use a valid due date.")
      .nullable()
      .optional(),
    text: z.string().trim().min(1).max(500),
  })
  .strict();

const todoItemSelect = {
  assignedHouseholdMember: {
    select: {
      color: true,
      emoji: true,
      id: true,
      name: true,
      account: {
        select: {
          email: true,
        },
      },
    },
  },
  assignedHouseholdMemberId: true,
  done: true,
  dueDate: true,
  id: true,
  text: true,
} satisfies Prisma.TodoItemSelect;

const todoListWithItemsSelect = {
  id: true,
  name: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    select: todoItemSelect,
  },
} satisfies Prisma.TodoListSelect;

const baseTodoLists = createOwnedListOperations<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>({
  itemListIdField: "todoListId",
  items: prisma.todoItem,
  lists: prisma.todoList,
  listWithItemsSelect: todoListWithItemsSelect,
});

type TodoItemRecord = Prisma.TodoItemGetPayload<{ select: typeof todoItemSelect }>;
type TodoListRecord = Prisma.TodoListGetPayload<{ select: typeof todoListWithItemsSelect }>;

function isValidDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === dateKey;
}

function dateKeyToUtcDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToDateKey(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toTodoItemView(item: TodoItemRecord): TodoItemView {
  return {
    assignedHouseholdMemberColor: item.assignedHouseholdMember?.color ?? null,
    assignedHouseholdMemberEmail: item.assignedHouseholdMember?.account?.email ?? null,
    assignedHouseholdMemberEmoji: item.assignedHouseholdMember?.emoji ?? null,
    assignedHouseholdMemberId: item.assignedHouseholdMemberId,
    assignedHouseholdMemberName: item.assignedHouseholdMember
      ? getHouseholdMemberName({
          accountEmail: item.assignedHouseholdMember.account?.email,
          name: item.assignedHouseholdMember.name,
        })
      : null,
    done: item.done,
    dueDate: utcDateToDateKey(item.dueDate),
    id: item.id,
    text: item.text,
  };
}

function toTodoListView(list: TodoListRecord): TodoListView {
  return {
    id: list.id,
    items: list.items.map(toTodoItemView),
    name: list.name,
  };
}

async function isValidTodoMemberId(memberId: string, householdId: string): Promise<boolean> {
  const member = await prisma.householdMember.findFirst({
    select: { id: true },
    where: { householdId, id: memberId },
  });

  return Boolean(member);
}

export function parseTodoItemInput(input: unknown): TodoItemInput {
  return todoItemInputSchema.parse(input);
}

export { parseOwnedListInput as parseTodoListInput } from "@/lib/owned-lists";

export const getCurrentTodoScope = getCurrentOwnedListScope<
  Pick<Prisma.TodoListUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.TodoListWhereInput
>;

export async function listAllTodoListsWithItems(scope: TodoScope): Promise<TodoListView[]> {
  const todoLists = await prisma.todoList.findMany({
    orderBy: { createdAt: "asc" },
    select: todoListWithItemsSelect,
    where: scope.where,
  });

  return todoLists.map(toTodoListView);
}

export async function createTodoList(name: string, scope: TodoScope): Promise<TodoListView> {
  const list = await prisma.todoList.create({
    data: { ...scope.create, name },
    select: todoListWithItemsSelect,
  });

  return toTodoListView(list);
}

export async function createTodoItem(
  listId: string,
  input: TodoItemInput,
  scope: TodoScope,
): Promise<TodoItemView | null> {
  const householdId = scope.create.householdId;

  if (!householdId) {
    return null;
  }

  const list = await prisma.todoList.findFirst({
    select: { id: true },
    where: { id: listId, ...scope.where },
  });

  if (!list) {
    return null;
  }

  const assignedHouseholdMemberId = input.assignedHouseholdMemberId ?? null;

  if (
    assignedHouseholdMemberId &&
    !(await isValidTodoMemberId(assignedHouseholdMemberId, householdId))
  ) {
    return null;
  }

  const item = await prisma.todoItem.create({
    data: {
      assignedHouseholdMemberId,
      dueDate: input.dueDate ? dateKeyToUtcDate(input.dueDate) : null,
      text: input.text,
      todoListId: listId,
    },
    select: todoItemSelect,
  });

  return toTodoItemView(item);
}

export async function toggleTodoItem(itemId: string, scope: TodoScope): Promise<TodoItemView | null> {
  const item = await prisma.todoItem.findFirst({
    select: { done: true, id: true },
    where: { id: itemId, list: scope.where },
  });

  if (!item) {
    return null;
  }

  const updated = await prisma.todoItem.update({
    data: { done: !item.done },
    select: todoItemSelect,
    where: { id: itemId },
  });

  return toTodoItemView(updated);
}

export async function deleteTodoItem(itemId: string, scope: TodoScope): Promise<boolean> {
  const result = await prisma.todoItem.deleteMany({
    where: { id: itemId, list: scope.where },
  });

  return wasDeleted(result);
}

export const deleteTodoList: (id: string, scope: TodoScope) => Promise<boolean> = baseTodoLists.deleteList;

export async function listTodoMembers(scope: TodoScope): Promise<TodoMemberView[]> {
  const householdId = scope.create.householdId;

  if (!householdId) {
    return [];
  }

  const members = await prisma.householdMember.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      color: true,
      emoji: true,
      id: true,
      name: true,
      account: {
        select: {
          email: true,
        },
      },
    },
    where: { householdId },
  });

  return members.map((member) => ({
    color: member.color,
    email: member.account?.email ?? null,
    emoji: member.emoji,
    id: member.id,
    name: member.name,
  }));
}
