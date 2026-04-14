"use client";

import type { SVGProps } from "react";
import { useEffect, useRef, useState } from "react";

import type { NoteView } from "@/lib/notes";

type NotesBoardProps = Readonly<{
  initialNotes: NoteView[];
}>;

type RightPaneState =
  | { mode: "idle" }
  | { mode: "new" }
  | { mode: "edit"; noteId: string };

type SaveStatus = "idle" | "saving" | "saved";

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

export function NotesBoard({ initialNotes }: NotesBoardProps) {
  const [notes, setNotes] = useState<NoteView[]>(initialNotes);
  const [pane, setPane] = useState<RightPaneState>(
    initialNotes[0] ? { mode: "edit", noteId: initialNotes[0].id } : { mode: "idle" },
  );
  const [editTitle, setEditTitle] = useState(initialNotes[0]?.title ?? "");
  const [editBody, setEditBody] = useState(initialNotes[0]?.body ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

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
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Debounced autosave — fires 800ms after the user stops typing.
  useEffect(() => {
    if (pane.mode === "idle" || !editTitle.trim()) return;

    const timer = setTimeout(() => {
      void saveRef.current();
    }, 800);

    return () => clearTimeout(timer);
  }, [editTitle, editBody, pane.mode]);

  function openNote(note: NoteView) {
    setPane({ mode: "edit", noteId: note.id });
    setEditTitle(note.title);
    setEditBody(note.body);
    setConfirmDeleteId(null);
    setSaveStatus("idle");
    setIsMobileDetailOpen(true);
  }

  function openNewNote() {
    setPane({ mode: "new" });
    setEditTitle("");
    setEditBody("");
    setConfirmDeleteId(null);
    setSaveStatus("idle");
    setIsMobileDetailOpen(true);
  }

  async function handleDelete(noteId: string) {
    setConfirmDeleteId(null);
    const prev = notes;
    const remaining = notes.filter((n) => n.id !== noteId);
    setNotes(remaining);

    const isCurrentlyOpen = pane.mode === "edit" && pane.noteId === noteId;

    if (isCurrentlyOpen) {
      const fallback = remaining[0];
      if (fallback) {
        openNote(fallback);
      } else {
        setPane({ mode: "idle" });
      }
      setIsMobileDetailOpen(false);
    }

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete note");
    } catch {
      setNotes(prev);
      if (isCurrentlyOpen) {
        const restored = prev.find((n) => n.id === noteId);
        if (restored) openNote(restored);
      }
    }
  }

  const selectedNoteId = pane.mode === "edit" ? pane.noteId : null;

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <h1 className="mb-5 font-serif text-2xl font-semibold text-[#171a18] sm:mb-6">Notes</h1>
      <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left pane: note list */}
        <aside
          className={`flex-col rounded-md border border-[#e0dcd4] bg-[#fffdf8] ${
            isMobileDetailOpen ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#e0dcd4] px-4 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#6a5b52]">
              Notes
            </h2>
            <button
              className="hidden h-7 rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-2 text-xs font-medium text-[#45614c] transition hover:bg-[#e2f0e4] sm:block"
              onClick={openNewNote}
              type="button"
            >
              + Add note
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {notes.length === 0 && pane.mode !== "new" && (
              <li className="px-4 py-6 text-center text-sm text-[#9a9e9b]">No notes yet.</li>
            )}
            {pane.mode === "new" && (
              <li className="flex items-center border-b border-[#e0dcd4] border-l-2 border-l-[#6e9274] bg-[#edf3ee]">
                <span className="min-w-0 flex-1 px-3 py-3 text-left text-sm font-medium text-[#426148]">
                  <span className="block truncate">
                    {editTitle.trim() || <span className="italic text-[#9ab5a0]">New note</span>}
                  </span>
                </span>
              </li>
            )}
            {notes.map((note) => {
              const isSelected = note.id === selectedNoteId;

              return (
                <li
                  className={`group flex items-center border-b border-[#e0dcd4] last:border-b-0 transition ${
                    isSelected
                      ? "border-l-2 border-l-[#6e9274] bg-[#edf3ee]"
                      : "border-l-2 border-l-transparent hover:bg-[#f4f1ea]"
                  }`}
                  key={note.id}
                >
                  <button
                    className={`min-w-0 flex-1 px-3 py-3 text-left text-sm ${
                      isSelected ? "font-medium text-[#426148]" : "text-[#4d5451]"
                    }`}
                    onClick={() => openNote(note)}
                    type="button"
                  >
                    <span className="block truncate">{note.title}</span>
                  </button>
                  {confirmDeleteId === note.id ? (
                    <div className="mr-2 flex shrink-0 items-center gap-1">
                      <span className="text-xs text-[#5d635f]">Delete?</span>
                      <button
                        className="min-h-7 rounded bg-[#f7ecea] px-2 py-1 text-xs font-medium text-[#a6543c] transition hover:bg-[#f0d4cf]"
                        onClick={() => handleDelete(note.id)}
                        type="button"
                      >
                        Yes
                      </button>
                      <button
                        className="min-h-7 rounded bg-[#ebe8de] px-2 py-1 text-xs font-medium text-[#5d635f] transition hover:bg-[#dedad0]"
                        onClick={() => setConfirmDeleteId(null)}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label={`Delete ${note.title}`}
                      className="mr-2 shrink-0 rounded p-2 text-[#b0aca5] opacity-0 transition hover:bg-[#f7ecea] hover:text-[#a6543c] group-hover:opacity-100"
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
          className={`min-h-[480px] min-w-0 rounded-md border border-[#e0dcd4] bg-[#fffdf8] ${
            isMobileDetailOpen ? "flex flex-col" : "hidden sm:flex sm:flex-col"
          }`}
        >
          {pane.mode === "idle" ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="font-serif text-lg text-[#5d635f]">Nothing selected.</p>
              <p className="mt-1 text-sm text-[#9a9e9b]">
                Pick a note from the list or add a new one.
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-3 border-b border-[#e0dcd4] px-4 py-3 sm:px-5">
                <button
                  aria-label="Back to notes"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec] sm:hidden"
                  onClick={() => setIsMobileDetailOpen(false)}
                  type="button"
                >
                  <ChevronLeftIcon aria-hidden className="h-5 w-5" />
                </button>
                <input
                  autoFocus={pane.mode === "new"}
                  className="min-w-0 flex-1 bg-transparent font-serif text-lg font-semibold text-[#171a18] placeholder:font-serif placeholder:text-[#c0bbb4] focus:outline-none"
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                  type="text"
                  value={editTitle}
                />
                {saveStatus !== "idle" && (
                  <span className="shrink-0 text-xs text-[#9a9e9b]">
                    {saveStatus === "saving" ? "Saving…" : "Saved"}
                  </span>
                )}
              </div>

              <textarea
                className="flex-1 resize-none bg-transparent px-4 py-4 text-sm leading-relaxed text-[#2d3230] placeholder:text-[#c0bbb4] focus:outline-none sm:px-5 sm:py-5"
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Write something…"
                value={editBody}
              />
            </div>
          )}
        </div>
      </div>

      {!isMobileDetailOpen && (
        <button
          aria-label="Add note"
          className="fixed bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-md border border-[#7aab86] bg-[#dff0e3] text-3xl font-bold leading-none text-[#3a6645] shadow-[0_14px_34px_rgba(31,35,30,0.22)] transition hover:bg-[#cce8d2] sm:hidden"
          onClick={openNewNote}
          type="button"
        >
          <span aria-hidden>+</span>
        </button>
      )}
    </div>
  );
}
