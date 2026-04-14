import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getCurrentUserScope, type UserScope } from "@/lib/scope";

export type NoteView = { id: string; title: string; body: string };

export { getCurrentUserScope as getCurrentNoteScope };

const noteSelect = {
  id: true,
  title: true,
  body: true,
} satisfies Prisma.NoteSelect;

const noteInputSchema = z
  .object({ title: z.string().trim().min(1).max(200), body: z.string().trim().max(50000) })
  .strict();

export function parseNoteInput(input: unknown): { title: string; body: string } {
  return noteInputSchema.parse(input);
}

export async function listAllNotes(scope: UserScope): Promise<NoteView[]> {
  return prisma.note.findMany({
    orderBy: { createdAt: "asc" },
    select: noteSelect,
    where: scope.where,
  });
}

export async function createNote(
  title: string,
  body: string,
  scope: UserScope,
): Promise<NoteView> {
  return prisma.note.create({
    data: { ...scope.create, title, body },
    select: noteSelect,
  });
}

export async function updateNote(
  id: string,
  title: string,
  body: string,
  scope: UserScope,
): Promise<NoteView | null> {
  const result = await prisma.note.updateMany({
    data: { title, body },
    where: { id, ...scope.where },
  });

  if (result.count === 0) return null;

  return prisma.note.findUnique({ select: noteSelect, where: { id } });
}

export async function deleteNote(id: string, scope: UserScope): Promise<boolean> {
  const result = await prisma.note.deleteMany({ where: { id, ...scope.where } });

  return result.count > 0;
}
