"use client";

import { useTranslations } from "next-intl";
import type { SVGProps } from "react";
import { useEffect, useRef, useState } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";
import type { NoteView } from "@/lib/notes";

type NotesBoardProps = Readonly<{
  initialNotes: NoteView[];
}>;

type RightPaneState =
  | { mode: "idle" }
  | { mode: "new" }
  | { mode: "edit"; noteId: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";
type NotesTranslator = ReturnType<typeof useTranslations>;

function notePreview(body: string, t: NotesTranslator): string {
  const firstLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return t("emptyPreview");
  }

  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

function formatLastEditedLabel(updatedAt: string | null, nowMs: number | null, t: NotesTranslator): string {
  if (!updatedAt) {
    return t("startWritingToSave");
  }

  const updatedAtDate = new Date(updatedAt);

  if (Number.isNaN(updatedAtDate.getTime()) || nowMs === null) {
    return t("autosaveHint");
  }

  const diffMs = nowMs - updatedAtDate.getTime();

  if (diffMs < 45_000) {
    return t("lastEditedJustNow");
  }

  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 60) {
    return t("lastEditedMinutes", { count: diffMinutes });
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return t("lastEditedHours", { count: diffHours });
  }

  const diffDays = Math.round(diffHours / 24);
  return t("lastEditedDays", { count: diffDays });
}

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function NotesBoard({ initialNotes }: NotesBoardProps) {
  const t = useTranslations("notesPage");
  const [notes, setNotes] = useState<NoteView[]>(initialNotes);
  const [pane, setPane] = useState<RightPaneState>(
    initialNotes[0] ? { mode: "edit", noteId: initialNotes[0].id } : { mode: "idle" },
  );
  const [editTitle, setEditTitle] = useState(initialNotes[0]?.title ?? "");
  const [editBody, setEditBody] = useState(initialNotes[0]?.body ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const isSavingRef = useRef(false);

  // Always-fresh save function — reassigned each render so the debounce timeout
  // always closes over the latest state without needing extra deps.
  const saveRef = useRef<() => Promise<void>>(async () => undefined);
  saveRef.current = async () => {
    const title = editTitle.trim();
    if (!title || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      if (pane.mode === "new") {
        const res = await fetch("/api/notes", {
          body: JSON.stringify({ title, body: editBody.trim() }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!res.ok) throw new Error("Failed to create note");

        const { note } = (await res.json()) as { note: NoteView };
        setNotes((prev) => [...prev, note]);
        setPane({ mode: "edit", noteId: note.id });
        trackAnalyticsEvent("note_created");
      } else if (pane.mode === "edit") {
        const res = await fetch(`/api/notes/${pane.noteId}`, {
          body: JSON.stringify({ title, body: editBody.trim() }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        if (!res.ok) throw new Error("Failed to update note");

        const { note } = (await res.json()) as { note: NoteView };
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Debounced autosave — fires 800ms after the user stops typing.
  useEffect(() => {
    if (pane.mode === "idle" || !editTitle.trim()) return;

    const timer = setTimeout(() => {
      saveRef.current().catch(() => undefined);
    }, 800);

    return () => clearTimeout(timer);
  }, [editTitle, editBody, pane.mode]);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Switches the editor to a note without flushing — used internally and in rollback paths.
  function switchToNote(note: NoteView) {
    setPane({ mode: "edit", noteId: note.id });
    setEditTitle(note.title);
    setEditBody(note.body);
    setConfirmDeleteId(null);
    setSaveStatus("idle");
    setIsMobileDetailOpen(true);
  }

  // P1: flush any pending draft before replacing editor state.
  // saveRef.current captures pre-switch title/body/pane from the current render closure,
  // so calling it here — before the setState calls below — saves the correct (old) note.
  function openNote(note: NoteView) {
    saveRef.current().catch(() => undefined);
    switchToNote(note);
  }

  function openNewNote() {
    saveRef.current().catch(() => undefined);
    setPane({ mode: "new" });
    setEditTitle("");
    setEditBody("");
    setConfirmDeleteId(null);
    setSaveStatus("idle");
    setIsMobileDetailOpen(true);
  }

  async function handleDelete(noteId: string) {
    setConfirmDeleteId(null);
    const deletedNote = notes.find((n) => n.id === noteId);
    const deletedIndex = notes.findIndex((n) => n.id === noteId);
    setNotes((current) => current.filter((n) => n.id !== noteId));

    const isCurrentlyOpen = pane.mode === "edit" && pane.noteId === noteId;

    if (isCurrentlyOpen) {
      // Switch without flushing — we're in the middle of a delete, not a user navigation.
      const remaining = notes.filter((n) => n.id !== noteId);
      const fallback = remaining[0];
      if (fallback) {
        switchToNote(fallback);
      } else {
        setPane({ mode: "idle" });
      }
      setIsMobileDetailOpen(false);
    }

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
    } catch {
      // P2: re-insert only the deleted note at its original position rather than
      // replacing the entire list, so concurrent edits to other notes are not lost.
      if (deletedNote) {
        setNotes((current) => {
          const restored = [...current];
          restored.splice(deletedIndex, 0, deletedNote);
          return restored;
        });
        if (isCurrentlyOpen) switchToNote(deletedNote);
      }
    }
  }

  const selectedNoteId = pane.mode === "edit" ? pane.noteId : null;
  const activeNote = selectedNoteId ? notes.find((note) => note.id === selectedNoteId) ?? null : null;
  const showRetry = saveStatus === "error";
  const saveMessage =
    saveStatus === "saving"
      ? t("savingChanges")
      : saveStatus === "error"
        ? t("saveErrorMessage")
      : pane.mode === "new" && !editTitle.trim()
        ? t("startWritingToSave")
        : formatLastEditedLabel(activeNote?.updatedAt ?? null, nowMs, t);

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <h1 className="mb-5 font-serif text-2xl font-semibold text-[var(--text-strong)] sm:mb-6">{t("title")}</h1>
      <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-5">
        {/* Left pane: note list */}
        <aside
          className={`flex-col rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] ${
            isMobileDetailOpen ? "hidden sm:flex" : "flex"
          }`}
        >
          <ul className="flex-1 overflow-y-auto">
            <li className="border-b border-[var(--border-muted)]">
              <button
                className="hidden w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--accent-sage-text)] sm:flex"
                onClick={openNewNote}
                type="button"
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-md border border-[var(--border-muted)] bg-[var(--surface-muted)] text-[var(--text-subtle)]"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </span>
                <span>{t("newNote")}</span>
              </button>
            </li>
            {notes.length === 0 && pane.mode !== "new" && (
              <li className="px-4 py-6 text-center text-sm text-[var(--text-subtle)]">{t("emptyList")}</li>
            )}
            {pane.mode === "new" && (
              <li className="flex items-center border-b border-[var(--border-muted)] border-l-4 border-l-[var(--accent-sage-strong)] bg-[var(--accent-sage-surface)]">
                <span className="min-w-0 flex-1 px-3 py-3 text-left">
                  <span className="block truncate text-sm font-semibold text-[var(--accent-sage-text)]">
                    {editTitle.trim() || <span className="italic text-[var(--text-subtle)]">{t("newNote")}</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--accent-sage-text)]">
                    {notePreview(editBody, t)}
                  </span>
                </span>
              </li>
            )}
            {notes.map((note) => {
              const isSelected = note.id === selectedNoteId;

              return (
                <li
                  className={`group flex items-center border-b border-[var(--border-muted)] last:border-b-0 transition ${
                    isSelected
                      ? "border-l-4 border-l-[var(--accent-sage-strong)] bg-[var(--accent-sage-surface)]"
                      : "border-l-4 border-l-transparent hover:bg-[var(--surface-secondary)]"
                  }`}
                  key={note.id}
                >
                  <button
                      className={`min-w-0 flex-1 px-3 py-3 text-left ${
                        isSelected ? "text-[var(--accent-sage-text)]" : "text-[var(--text-primary)]"
                      }`}
                    onClick={() => openNote(note)}
                    type="button"
                  >
                    <span className={`block break-words text-sm ${isSelected ? "font-semibold" : "font-medium"}`}>
                      {note.title}
                    </span>
                    <span
                      className={`mt-1 block truncate text-xs ${
                        isSelected ? "text-[var(--accent-sage-text)]" : "text-[var(--text-subtle)]"
                      }`}
                    >
                      {notePreview(note.body, t)}
                    </span>
                  </button>
                  {confirmDeleteId === note.id ? (
                    <div className="mr-2 flex max-w-[9rem] shrink-0 flex-wrap items-center gap-1 sm:max-w-none">
                      <span className="text-xs text-[var(--text-muted)]">{t("deleteConfirm")}</span>
                      <button
                        className="min-h-7 rounded bg-[var(--accent-rose-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)]"
                        onClick={() => handleDelete(note.id)}
                        type="button"
                      >
                        {t("confirmDelete")}
                      </button>
                      <button
                        className="min-h-7 rounded bg-[var(--surface-secondary)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
                        onClick={() => setConfirmDeleteId(null)}
                        type="button"
                      >
                        {t("cancelDelete")}
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label={t("deleteNoteAria", { title: note.title })}
                      className="mr-2 shrink-0 rounded p-2 text-[var(--text-subtle)] opacity-100 transition hover:bg-[var(--accent-rose-soft)] hover:text-[var(--accent-rose-text)] sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => setConfirmDeleteId(note.id)}
                      type="button"
                    >
                      <TrashIcon height="13" width="13" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right pane: editor */}
        <div
          className={`min-h-[480px] min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-soft)] ${
            isMobileDetailOpen ? "flex flex-col" : "hidden sm:flex sm:flex-col"
          }`}
        >
          {pane.mode === "idle" ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="font-serif text-lg text-[var(--text-muted)]">{t("nothingSelected")}</p>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                {t("nothingSelectedHint")}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="border-b border-[var(--border-muted)] bg-[var(--surface-secondary)] px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
                <div className="flex items-start gap-3">
                  <button
                    aria-label={t("backToNotes")}
                    className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] sm:hidden"
                    onClick={() => setIsMobileDetailOpen(false)}
                    type="button"
                  >
                    <ChevronLeftIcon aria-hidden className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <input
                      autoFocus={pane.mode === "new"}
                      className="min-w-0 w-full bg-transparent font-serif text-[1.4rem] font-semibold text-[var(--text-strong)] placeholder:font-serif placeholder:text-[var(--input-placeholder)] focus:outline-none"
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={t("untitledPlaceholder")}
                      type="text"
                      value={editTitle}
                    />
                    <div className="mt-3 text-sm text-[var(--text-muted)]">
                      <p>{saveMessage}</p>
                      {showRetry ? (
                        <button
                          className="mt-2 min-h-7 rounded bg-[var(--accent-rose-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)]"
                          onClick={() => saveRef.current().catch(() => undefined)}
                          type="button"
                        >
                          {t("retrySave")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <textarea
                className="flex-1 resize-none bg-transparent px-4 pt-6 pb-5 text-[15px] leading-[1.95] text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none sm:px-6 sm:pt-7 sm:pb-6"
                onChange={(e) => setEditBody(e.target.value)}
                placeholder={t("bodyPlaceholder")}
                value={editBody}
              />
            </div>
          )}
        </div>
      </div>

      {!isMobileDetailOpen && (
        <button
          aria-label={t("addNoteAria")}
          className="fixed bottom-[calc(5.75rem_+_env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-3xl font-bold leading-none text-[var(--accent-sage-text)] shadow-[var(--shadow-float)] transition hover:bg-[var(--surface-secondary)] sm:hidden"
          onClick={openNewNote}
          type="button"
        >
          <span aria-hidden>+</span>
        </button>
      )}
    </div>
  );
}
