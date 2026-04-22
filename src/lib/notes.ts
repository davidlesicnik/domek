import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getCurrentOwnedListScope, type OwnedListScope } from "@/lib/owned-lists";

export type NoteView = { id: string; title: string; body: string; updatedAt: string };

type NoteScope = OwnedListScope<
  Pick<Prisma.NoteUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.NoteWhereInput
>;

export const getCurrentNoteScope = getCurrentOwnedListScope<
  Pick<Prisma.NoteUncheckedCreateInput, "createdByUserId" | "householdId">,
  Prisma.NoteWhereInput
>;

const noteSelect = {
  id: true,
  title: true,
  body: true,
  updatedAt: true,
} satisfies Prisma.NoteSelect;

function toNoteView(
  note: Pick<Prisma.NoteGetPayload<{ select: typeof noteSelect }>, "id" | "title" | "body" | "updatedAt">,
): NoteView {
  return {
    body: note.body,
    id: note.id,
    title: note.title,
    updatedAt: note.updatedAt.toISOString(),
  };
}

const noteInputSchema = z
  .object({ title: z.string().trim().min(1).max(200), body: z.string().trim().max(50000) })
  .strict();

export function parseNoteInput(input: unknown): { title: string; body: string } {
  return noteInputSchema.parse(input);
}

export async function listAllNotes(scope: NoteScope): Promise<NoteView[]> {
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: "asc" },
    select: noteSelect,
    where: scope.where,
  });

  return notes.map(toNoteView);
}

export async function createNote(
  title: string,
  body: string,
  scope: NoteScope,
): Promise<NoteView> {
  const note = await prisma.note.create({
    data: { ...scope.create, title, body },
    select: noteSelect,
  });

  return toNoteView(note);
}

export async function updateNote(
  id: string,
  title: string,
  body: string,
  scope: NoteScope,
): Promise<NoteView | null> {
  const result = await prisma.note.updateMany({
    data: { title, body },
    where: { id, ...scope.where },
  });

  if (result.count === 0) return null;

  const note = await prisma.note.findUnique({ select: noteSelect, where: { id } });

  return note ? toNoteView(note) : null;
}

export async function deleteNote(id: string, scope: NoteScope): Promise<boolean> {
  const result = await prisma.note.deleteMany({ where: { id, ...scope.where } });

  return result.count > 0;
}
