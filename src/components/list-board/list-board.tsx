"use client";

import type { SVGProps } from "react";
import { useEffect, useRef, useState } from "react";

import { trackAnalyticsEvent } from "@/lib/analytics";

export type ListItemView = { id: string; text: string; done: boolean };
export type ListView = { id: string; name: string; items: ListItemView[] };
export type ListBoardAnalyticsArea = "shopping" | "todo";

type ListBoardProps = Readonly<{
  title: string;
  listsPath: string;
  itemsPath: string;
  initialLists: ListView[];
  analyticsArea: ListBoardAnalyticsArea;
}>;

// Pure helpers — extracted to avoid deep nesting inside state updaters

function withItemReplaced(
  lists: ListView[],
  listId: string,
  oldId: string,
  newItem: ListItemView,
): ListView[] {
  return lists.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === oldId ? newItem : i)) }
      : l,
  );
}

function withItemToggled(
  lists: ListView[],
  listId: string,
  itemId: string,
  done: boolean,
): ListView[] {
  return lists.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done } : i)) }
      : l,
  );
}

function withItemRemoved(lists: ListView[], listId: string, itemId: string): ListView[] {
  return lists.map((l) =>
    l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l,
  );
}

function withItemAppended(lists: ListView[], listId: string, item: ListItemView): ListView[] {
  return lists.map((l) =>
    l.id === listId ? { ...l, items: [...l.items, item] } : l,
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function ChevronLeftIcon(props: IconProps) {
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

export function ListBoard({
  title,
  listsPath,
  itemsPath,
  initialLists,
  analyticsArea,
}: ListBoardProps) {
  const [lists, setLists] = useState<ListView[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists[0]?.id ?? null,
  );
  const [newListName, setNewListName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [isSavingList, setIsSavingList] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;

  function focusItemInput() {
    if (!globalThis.matchMedia("(pointer: coarse)").matches) {
      newItemInputRef.current?.focus();
    }
  }

  // Focus after list selection (runs after React renders the right pane)
  useEffect(() => {
    if (selectedListId) {
      focusItemInput();
    }
  }, [selectedListId]);

  // Focus after an item is saved (runs after React re-enables the input)
  const wasSavingItem = useRef(false);
  useEffect(() => {
    if (wasSavingItem.current && !isSavingItem) {
      focusItemInput();
    }
    wasSavingItem.current = isSavingItem;
  }, [isSavingItem]);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name || isSavingList) return;

    setIsSavingList(true);
    setNewListName("");

    try {
      const res = await fetch(listsPath, {
        body: JSON.stringify({ name }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create list");

      const { list } = (await res.json()) as { list: ListView };
      setLists((prev) => [...prev, list]);
      setSelectedListId(list.id);
      setIsMobileListOpen(true);
      trackAnalyticsEvent("list_created", { area: analyticsArea });
    } catch {
      setNewListName(name);
    } finally {
      setIsSavingList(false);
    }
  }

  async function handleDeleteList(listId: string) {
    setConfirmDeleteListId(null);
    const prev = lists;
    const remaining = lists.filter((l) => l.id !== listId);
    setLists(remaining);

    if (selectedListId === listId) {
      setSelectedListId(remaining[0]?.id ?? null);
      setIsMobileListOpen(false);
    }

    try {
      const res = await fetch(`${listsPath}/${listId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete list");
    } catch {
      setLists(prev);
      setSelectedListId(listId);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text || !selectedList || isSavingItem) return;

    setIsSavingItem(true);
    setNewItemText("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticItem: ListItemView = { done: false, id: optimisticId, text };

    setLists((prev) => withItemAppended(prev, selectedList.id, optimisticItem));

    try {
      const res = await fetch(`${listsPath}/${selectedList.id}/items`, {
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create item");

      const { item } = (await res.json()) as { item: ListItemView };
      setLists((prev) => withItemReplaced(prev, selectedList.id, optimisticId, item));
      trackAnalyticsEvent("list_item_added", { area: analyticsArea });
    } catch {
      setNewItemText(text);
      setLists((prev) => withItemRemoved(prev, selectedList.id, optimisticId));
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleToggleItem(listId: string, itemId: string, currentDone: boolean) {
    setLists((prev) => withItemToggled(prev, listId, itemId, !currentDone));

    try {
      const res = await fetch(`${itemsPath}/${itemId}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to toggle item");
      if (!currentDone) {
        trackAnalyticsEvent("list_item_checked", { area: analyticsArea });
      }
    } catch {
      setLists((prev) => withItemToggled(prev, listId, itemId, currentDone));
    }
  }

  async function handleDeleteItem(listId: string, itemId: string) {
    setConfirmDeleteItemId(null);
    const prevItem = lists.find((l) => l.id === listId)?.items.find((i) => i.id === itemId);

    setLists((prev) => withItemRemoved(prev, listId, itemId));

    try {
      const res = await fetch(`${itemsPath}/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
    } catch {
      if (prevItem) {
        setLists((prev) => withItemAppended(prev, listId, prevItem));
      }
    }
  }

  function openList(listId: string) {
    setSelectedListId(listId);
    setConfirmDeleteListId(null);
    setConfirmDeleteItemId(null);
    setIsMobileListOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <h1 className="mb-5 font-serif text-2xl font-semibold text-[#171a18] sm:mb-6">{title}</h1>
      <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left pane: list of lists */}
        <aside
          className={`flex-col gap-0 rounded-md border border-[#e0dcd4] bg-[#fffdf8] ${
            isMobileListOpen ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="border-b border-[#e0dcd4] px-4 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#6a5b52]">
              Lists
            </h2>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {lists.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-[#9a9e9b]">No lists yet.</li>
            )}
            {lists.map((list) => {
              const doneCount = list.items.filter((i) => i.done).length;
              const totalCount = list.items.length;
              const isSelected = list.id === selectedListId;

              return (
                <li
                  className={`group flex items-start border-b border-[#e0dcd4] last:border-b-0 transition sm:items-center ${
                    isSelected
                      ? "border-l-2 border-l-[#6e9274] bg-[#edf3ee]"
                      : "border-l-2 border-l-transparent hover:bg-[#f4f1ea]"
                  }`}
                  key={list.id}
                >
                  <button
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-3 text-left text-sm ${
                      isSelected ? "font-medium text-[#426148]" : "text-[#4d5451]"
                    }`}
                    onClick={() => openList(list.id)}
                    type="button"
                  >
                    <span className="flex-1 truncate">{list.name}</span>
                    {totalCount > 0 && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          isSelected
                            ? "bg-[#c8deca] text-[#426148]"
                            : "bg-[#ebe8de] text-[#6a5b52]"
                        }`}
                      >
                        {doneCount}/{totalCount}
                      </span>
                    )}
                  </button>
                  {confirmDeleteListId === list.id ? (
                    <div className="mr-2 flex shrink-0 flex-wrap items-center justify-end gap-1 py-2">
                      <span className="text-xs text-[#5d635f]">Delete?</span>
                      <button
                        className="min-h-8 rounded bg-[#f7ecea] px-2 py-1 text-xs font-medium text-[#a6543c] transition hover:bg-[#f0d4cf]"
                        onClick={() => handleDeleteList(list.id)}
                        type="button"
                      >
                        Yes
                      </button>
                      <button
                        className="min-h-8 rounded bg-[#ebe8de] px-2 py-1 text-xs font-medium text-[#5d635f] transition hover:bg-[#dedad0]"
                        onClick={() => setConfirmDeleteListId(null)}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label={`Delete ${list.name}`}
                      className="mr-2 mt-1.5 shrink-0 rounded p-2 text-[#b0aca5] transition hover:bg-[#f7ecea] hover:text-[#a6543c] sm:mt-0"
                      onClick={() => setConfirmDeleteListId(list.id)}
                      type="button"
                    >
                      <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {/* New list form */}
          <form
            className="grid gap-2 border-t border-[#e0dcd4] px-4 py-3 sm:flex"
            onSubmit={handleCreateList}
          >
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm text-[#171a18] placeholder:text-[#b0aca5] focus:border-[#9bb6a4] focus:outline-none sm:h-9"
              disabled={isSavingList}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list…"
              type="text"
              value={newListName}
            />
            <button
              className="h-10 shrink-0 rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-3 text-sm font-medium text-[#45614c] transition hover:bg-[#e2f0e4] disabled:opacity-50 sm:h-9"
              disabled={isSavingList || !newListName.trim()}
              type="submit"
            >
              Add
            </button>
          </form>
        </aside>

        {/* Right pane: items for selected list */}
        <div
          className={`min-w-0 rounded-md border border-[#e0dcd4] bg-[#fffdf8] ${
            isMobileListOpen ? "block" : "hidden sm:block"
          }`}
        >
          {selectedList ? (
            <>
              <div className="flex items-center gap-3 border-b border-[#e0dcd4] px-4 py-3 sm:px-5">
                <button
                  aria-label="Back to lists"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#5d635f] transition hover:bg-[#f7f4ec] sm:hidden"
                  onClick={() => setIsMobileListOpen(false)}
                  type="button"
                >
                  <ChevronLeftIcon aria-hidden className="h-5 w-5" />
                </button>
                <h2 className="min-w-0 break-words font-serif text-lg font-semibold text-[#171a18]">
                  {selectedList.name}
                </h2>
              </div>

              <ul className="flex-1 overflow-y-auto">
                {selectedList.items.length === 0 && (
                  <li className="m-4 rounded-md border border-dashed border-[#d8d2c8] px-4 py-8 text-center text-sm text-[#9a9e9b] sm:m-5 sm:px-5">
                    Nothing here yet. Add an item below.
                  </li>
                )}
                {selectedList.items.map((item) => (
                  <li
                    className="group flex items-start gap-3 border-b border-[#f0ede6] px-4 py-3 last:border-b-0 sm:items-center sm:px-5"
                    key={item.id}
                  >
                    <input
                      checked={item.done}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#6e9274] sm:h-4 sm:w-4"
                      onChange={() => handleToggleItem(selectedList.id, item.id, item.done)}
                      type="checkbox"
                    />
                    <span
                      className={`min-w-0 flex-1 break-words text-sm leading-snug ${
                        item.done ? "text-[#9a9e9b] line-through" : "text-[#2d3230]"
                      }`}
                    >
                      {item.text}
                    </span>
                    {confirmDeleteItemId === item.id ? (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        <span className="text-xs text-[#5d635f]">Delete?</span>
                        <button
                          className="min-h-8 rounded bg-[#f7ecea] px-2 py-1 text-xs font-medium text-[#a6543c] transition hover:bg-[#f0d4cf]"
                          onClick={() => handleDeleteItem(selectedList.id, item.id)}
                          type="button"
                        >
                          Yes
                        </button>
                        <button
                          className="min-h-8 rounded bg-[#ebe8de] px-2 py-1 text-xs font-medium text-[#5d635f] transition hover:bg-[#dedad0]"
                          onClick={() => setConfirmDeleteItemId(null)}
                          type="button"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label="Delete item"
                        className="shrink-0 rounded p-2 text-[#b0aca5] transition hover:bg-[#f7ecea] hover:text-[#a6543c] sm:p-1.5"
                        onClick={() => setConfirmDeleteItemId(item.id)}
                        type="button"
                      >
                        <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add item form */}
              <form
                className="grid gap-2 border-t border-[#e0dcd4] p-4 sm:flex"
                onSubmit={handleCreateItem}
              >
                <input
                  ref={newItemInputRef}
                  className="h-10 min-w-0 flex-1 rounded-md border border-[#d8d2c8] bg-white px-3 text-sm text-[#171a18] placeholder:text-[#b0aca5] focus:border-[#9bb6a4] focus:outline-none sm:h-9"
                  disabled={isSavingItem}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Add an item…"
                  type="text"
                  value={newItemText}
                />
                <button
                  className="h-10 rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-3 text-sm font-medium text-[#45614c] transition hover:bg-[#e2f0e4] disabled:opacity-50 sm:h-9"
                  disabled={isSavingItem || !newItemText.trim()}
                  type="submit"
                >
                  Add
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="font-serif text-lg text-[#5d635f]">Nothing here yet.</p>
              <p className="mt-1 text-sm text-[#9a9e9b]">Create a list on the left to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
