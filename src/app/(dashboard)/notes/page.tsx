import type { Metadata } from "next";

import { NotesBoard } from "@/components/notes/notes-board";
import { getCurrentNoteScope, listAllNotes } from "@/lib/notes";

export const metadata: Metadata = {
  title: "Notes | Domek",
  description: "Shared household notes.",
};

export default async function NotesPage() {
  const scope = await getCurrentNoteScope();
  const initialNotes = scope ? await listAllNotes(scope) : [];

  return <NotesBoard initialNotes={initialNotes} />;
}
