import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NotesBoard } from "@/components/notes/notes-board";
import { getCurrentNoteScope, listAllNotes } from "@/lib/notes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notesPage");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function NotesPage() {
  const scope = await getCurrentNoteScope();
  const initialNotes = scope ? await listAllNotes(scope) : [];

  return <NotesBoard initialNotes={initialNotes} />;
}
