"use client";

import type { ReactNode, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { trackAnalyticsEvent } from "@/lib/analytics";

export type ListItemView = { id: string; text: string; done: boolean };
export type ListView<TItem extends ListItemView = ListItemView> = {
  id: string;
  name: string;
  items: TItem[];
};
export type ListBoardAnalyticsArea = "shopping" | "todo";

type ListBoardProps<TItem extends ListItemView = ListItemView, TCreateItemInput extends object = { text: string }> = Readonly<{
  title: string;
  listsPath: string;
  itemsPath: string;
  initialLists: ListView<TItem>[];
  analyticsArea: ListBoardAnalyticsArea;
  autoOpenComposer?: boolean;
  createItemInput?: (text: string) => TCreateItemInput;
  createOptimisticItem?: (input: { id: string; text: string }) => TItem;
  onItemCreated?: () => void;
  renderComposerFooter?: (input: {
    canSubmit: boolean;
    disabled: boolean;
    isFocused: boolean;
  }) => ReactNode;
  renderItemMeta?: (item: TItem) => ReactNode;
}>;

// Pure helpers — extracted to avoid deep nesting inside state updaters

function withItemReplaced<TItem extends ListItemView>(
  lists: ListView<TItem>[],
  listId: string,
  oldId: string,
  newItem: TItem,
): ListView<TItem>[] {
  return lists.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === oldId ? newItem : i)) }
      : l,
  );
}

function withItemToggled<TItem extends ListItemView>(
  lists: ListView<TItem>[],
  listId: string,
  itemId: string,
  done: boolean,
): ListView<TItem>[] {
  return lists.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done } : i)) }
      : l,
  );
}

function withItemRemoved<TItem extends ListItemView>(
  lists: ListView<TItem>[],
  listId: string,
  itemId: string,
): ListView<TItem>[] {
  return lists.map((l) =>
    l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l,
  );
}

function withItemAppended<TItem extends ListItemView>(
  lists: ListView<TItem>[],
  listId: string,
  item: TItem,
): ListView<TItem>[] {
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

function TrashIcon(props: IconProps) {
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

function DeleteConfirmActions({
  onCancel,
  onConfirm,
  t,
}: Readonly<{
  onCancel: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <div className="flex max-w-[9rem] shrink-0 flex-wrap items-center justify-end gap-1 sm:max-w-none">
      <span className="text-xs text-[var(--text-muted)]">{t("deleteConfirm")}</span>
      <button
        className="min-h-8 rounded bg-[var(--accent-rose-soft)] px-2 py-1 text-xs font-medium text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)]"
        onClick={onConfirm}
        type="button"
      >
        {t("confirmYes")}
      </button>
      <button
        className="min-h-8 rounded bg-[var(--surface-secondary)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)]"
        onClick={onCancel}
        type="button"
      >
        {t("confirmNo")}
      </button>
    </div>
  );
}

function DeleteIconButton({
  ariaLabel,
  className,
  onClick,
}: Readonly<{
  ariaLabel: string;
  className: string;
  onClick: () => void;
}>) {
  return (
    <button aria-label={ariaLabel} className={className} onClick={onClick} type="button">
      <TrashIcon height="14" width="14" />
    </button>
  );
}

function ListItemRow<TItem extends ListItemView>({
  confirmDeleteItemId,
  item,
  listId,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onToggle,
  renderItemMeta,
  rowClassName,
  t,
}: Readonly<{
  confirmDeleteItemId: string | null;
  item: TItem;
  listId: string;
  onCancelDelete: () => void;
  onConfirmDelete: (listId: string, itemId: string) => void;
  onRequestDelete: (itemId: string) => void;
  onToggle: (listId: string, itemId: string, currentDone: boolean) => void;
  renderItemMeta?: (item: TItem) => ReactNode;
  rowClassName: string;
  t: ReturnType<typeof useTranslations>;
}>) {
  return (
    <li className={rowClassName} key={item.id}>
      <input
        checked={item.done}
        className="mt-[1px] h-5 w-5 shrink-0 cursor-pointer accent-[var(--accent-sage-strong)] sm:h-4 sm:w-4"
        onChange={() => onToggle(listId, item.id, item.done)}
        type="checkbox"
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block break-words text-sm leading-snug text-[var(--text-primary)] ${
            item.done ? "line-through" : ""
          }`}
        >
          {item.text}
        </span>
        {renderItemMeta ? renderItemMeta(item) : null}
      </span>
      {confirmDeleteItemId === item.id ? (
        <DeleteConfirmActions
          onCancel={onCancelDelete}
          onConfirm={() => onConfirmDelete(listId, item.id)}
          t={t}
        />
      ) : (
        <DeleteIconButton
          ariaLabel={t("deleteItemAriaLabel")}
          className="shrink-0 rounded p-2 text-[var(--text-subtle)] transition hover:bg-[var(--accent-rose-soft)] hover:text-[var(--accent-rose-text)] sm:p-1.5"
          onClick={() => onRequestDelete(item.id)}
        />
      )}
    </li>
  );
}

export function ListBoard<TItem extends ListItemView, TCreateItemInput extends object = { text: string }>({
  title,
  listsPath,
  itemsPath,
  initialLists,
  analyticsArea,
  autoOpenComposer = false,
  createItemInput,
  createOptimisticItem,
  onItemCreated,
  renderComposerFooter,
  renderItemMeta,
}: ListBoardProps<TItem, TCreateItemInput>) {
  const t = useTranslations("listBoard");
  const [lists, setLists] = useState<ListView<TItem>[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists[0]?.id ?? null,
  );
  const [newListName, setNewListName] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [isSavingList, setIsSavingList] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(autoOpenComposer && initialLists.length > 0);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [enteringItemIds, setEnteringItemIds] = useState<string[]>([]);
  const [recentlyCompletedItemIds, setRecentlyCompletedItemIds] = useState<string[]>([]);
  const composerFormRef = useRef<HTMLFormElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const enterAnimationTimersRef = useRef<Map<string, number>>(new Map());
  const completionAnimationTimersRef = useRef<Map<string, number>>(new Map());

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

  useEffect(() => {
    if (!autoOpenComposer || !selectedListId) {
      return;
    }

    setIsMobileListOpen(true);
    focusItemInput();
  }, [autoOpenComposer, selectedListId]);

  // Focus after an item is saved (runs after React re-enables the input)
  const wasSavingItem = useRef(false);
  useEffect(() => {
    if (wasSavingItem.current && !isSavingItem) {
      focusItemInput();
    }
    wasSavingItem.current = isSavingItem;
  }, [isSavingItem]);

  useEffect(() => {
    const enterAnimationTimers = enterAnimationTimersRef.current;
    const completionAnimationTimers = completionAnimationTimersRef.current;

    return () => {
      for (const timerId of enterAnimationTimers.values()) {
        window.clearTimeout(timerId);
      }
      enterAnimationTimers.clear();

      for (const timerId of completionAnimationTimers.values()) {
        window.clearTimeout(timerId);
      }
      completionAnimationTimers.clear();
    };
  }, []);

  function markItemEntering(itemId: string) {
    const existingTimer = enterAnimationTimersRef.current.get(itemId);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setEnteringItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));

    const timerId = window.setTimeout(() => {
      setEnteringItemIds((current) => current.filter((currentItemId) => currentItemId !== itemId));
      enterAnimationTimersRef.current.delete(itemId);
    }, 520);

    enterAnimationTimersRef.current.set(itemId, timerId);
  }

  function markItemCompleted(itemId: string) {
    const existingTimer = completionAnimationTimersRef.current.get(itemId);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setRecentlyCompletedItemIds((current) =>
      current.includes(itemId) ? current : [...current, itemId],
    );

    const timerId = window.setTimeout(() => {
      setRecentlyCompletedItemIds((current) =>
        current.filter((currentItemId) => currentItemId !== itemId),
      );
      completionAnimationTimersRef.current.delete(itemId);
    }, 420);

    completionAnimationTimersRef.current.set(itemId, timerId);
  }

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

      const { list } = (await res.json()) as { list: ListView<TItem> };
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
    const optimisticItem = createOptimisticItem
      ? createOptimisticItem({ id: optimisticId, text })
      : ({ done: false, id: optimisticId, text } as TItem);

    setLists((prev) => withItemAppended(prev, selectedList.id, optimisticItem));

    try {
      const res = await fetch(`${listsPath}/${selectedList.id}/items`, {
        body: JSON.stringify(createItemInput ? createItemInput(text) : { text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create item");

      const { item } = (await res.json()) as { item: TItem };
      setLists((prev) => withItemReplaced(prev, selectedList.id, optimisticId, item));
      markItemEntering(item.id);
      onItemCreated?.();
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

    if (!currentDone) {
      markItemCompleted(itemId);
    }

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

  const activeItems = selectedList?.items.filter((item) => !item.done) ?? [];
  const completedItems = selectedList?.items.filter((item) => item.done) ?? [];

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <h1 className="mb-5 font-serif text-2xl font-semibold text-[var(--text-strong)] sm:mb-6">{title}</h1>
      <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-5">
        {/* Left pane: list of lists */}
        <aside
          className={`flex-col gap-0 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] ${
            isMobileListOpen ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="border-b border-[var(--border-muted)] px-4 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {t("listsHeading")}
            </h2>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {lists.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-[var(--text-subtle)]">{t("noLists")}</li>
            )}
            {lists.map((list) => {
              const doneCount = list.items.filter((i) => i.done).length;
              const totalCount = list.items.length;
              const isSelected = list.id === selectedListId;

              return (
                <li
                  className={`group flex items-start border-b border-[var(--border-muted)] last:border-b-0 transition sm:items-center ${
                    isSelected
                      ? "border-l-2 border-l-[var(--accent-sage-strong)] bg-[var(--accent-sage-surface)]"
                      : "border-l-2 border-l-transparent hover:bg-[var(--surface-secondary)]"
                  }`}
                  key={list.id}
                >
                  <button
                    className={`flex min-w-0 flex-1 items-start gap-2 px-3 py-3 text-left text-sm sm:items-center ${
                      isSelected ? "font-medium text-[var(--accent-sage-text)]" : "text-[var(--text-primary)]"
                    }`}
                    onClick={() => openList(list.id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 flex-1 break-words">{list.name}</span>
                        {totalCount > 0 ? (
                          <span
                            className={`shrink-0 text-[10px] font-semibold ${
                              isSelected ? "text-[var(--accent-sage-text)]" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {doneCount}/{totalCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {totalCount > 0 && (
                      <span className="shrink-0 self-center">
                        <span
                          aria-hidden
                          className={`block h-1.5 w-10 overflow-hidden rounded-full sm:w-14 ${
                            isSelected ? "bg-[var(--accent-sage-border)]" : "bg-[var(--border-default)]"
                          }`}
                        >
                          <span
                            className={`block h-full rounded-full transition-[width] duration-300 ${
                              isSelected ? "bg-[var(--accent-sage-strong)]" : "bg-[var(--text-subtle)]"
                            }`}
                            style={{ width: `${Math.max(8, Math.round((doneCount / totalCount) * 100))}%` }}
                          />
                        </span>
                        <span className="sr-only">
                          {t("itemsProgress", { done: doneCount, total: totalCount })}
                        </span>
                      </span>
                    )}
                  </button>
                  {confirmDeleteListId === list.id ? (
                    <div className="mr-2 py-2">
                      <DeleteConfirmActions
                        onCancel={() => setConfirmDeleteListId(null)}
                        onConfirm={() => handleDeleteList(list.id)}
                        t={t}
                      />
                    </div>
                  ) : (
                    <DeleteIconButton
                      ariaLabel={t("deleteListAriaLabel", { name: list.name })}
                      className="mr-2 mt-1.5 shrink-0 self-start rounded p-2 text-[var(--text-subtle)] transition hover:bg-[var(--accent-rose-soft)] hover:text-[var(--accent-rose-text)] sm:mt-0 sm:self-center"
                      onClick={() => setConfirmDeleteListId(list.id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {/* New list form */}
          <form
            className="grid gap-2 border-t border-[var(--border-muted)] px-4 py-3 sm:flex"
            onSubmit={handleCreateList}
          >
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:border-[var(--focus-ring)] focus:outline-none sm:h-9 sm:text-sm"
              disabled={isSavingList}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder={t("newListPlaceholder")}
              type="text"
              value={newListName}
            />
            <button
              className="h-10 w-full shrink-0 rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-sm font-medium text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50 sm:h-9 sm:w-auto"
              disabled={isSavingList || !newListName.trim()}
              type="submit"
            >
              {t("addListButton")}
            </button>
          </form>
        </aside>

        {/* Right pane: items for selected list */}
        <div
          className={`min-w-0 rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] ${
            isMobileListOpen ? "block" : "hidden sm:block"
          }`}
        >
          {selectedList ? (
            <>
              <div className="flex items-center gap-3 border-b border-[var(--border-muted)] px-4 py-3 sm:px-5">
                <button
                  aria-label={t("backToLists")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:bg-[var(--surface-secondary)] sm:hidden"
                  onClick={() => setIsMobileListOpen(false)}
                  type="button"
                >
                  <ChevronLeftIcon aria-hidden className="h-5 w-5" />
                </button>
                <h2 className="min-w-0 break-words font-serif text-lg font-semibold text-[var(--text-strong)]">
                  {selectedList.name}
                </h2>
              </div>

              <ul className="flex-1 overflow-y-auto">
                {selectedList.items.length === 0 && (
                  <li className="m-4 rounded-md border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-sm text-[var(--text-subtle)] sm:m-5 sm:px-5">
                    {t("emptyList")}
                  </li>
                )}
                {activeItems.map((item) => (
                  <ListItemRow
                    confirmDeleteItemId={confirmDeleteItemId}
                    item={item}
                    key={item.id}
                    listId={selectedList.id}
                    onCancelDelete={() => setConfirmDeleteItemId(null)}
                    onConfirmDelete={handleDeleteItem}
                    onRequestDelete={setConfirmDeleteItemId}
                    onToggle={handleToggleItem}
                    renderItemMeta={renderItemMeta}
                    rowClassName={`group flex items-start gap-3 border-b border-[var(--border-muted)] px-4 py-3 sm:px-5 ${
                      enteringItemIds.includes(item.id)
                        ? "animate-[list-item-enter_520ms_cubic-bezier(0.16,1,0.3,1)] bg-[var(--accent-sage-surface)]"
                        : ""
                    }`}
                    t={t}
                  />
                ))}
                {completedItems.length > 0 ? (
                  <>
                    <li className="border-b border-[var(--border-muted)] bg-[var(--surface-muted)] px-4 py-2 sm:px-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                        {t("completedHeading")}
                      </span>
                    </li>
                    {completedItems.map((item, index) => (
                      <ListItemRow
                        confirmDeleteItemId={confirmDeleteItemId}
                        item={item}
                        key={item.id}
                        listId={selectedList.id}
                        onCancelDelete={() => setConfirmDeleteItemId(null)}
                        onConfirmDelete={handleDeleteItem}
                        onRequestDelete={setConfirmDeleteItemId}
                        onToggle={handleToggleItem}
                        renderItemMeta={renderItemMeta}
                        rowClassName={`group flex items-start gap-3 border-b border-[var(--border-muted)] px-4 py-3 opacity-55 sm:px-5 ${
                          recentlyCompletedItemIds.includes(item.id)
                            ? "animate-[list-item-complete_420ms_cubic-bezier(0.22,1,0.36,1)]"
                            : ""
                        } ${index === completedItems.length - 1 ? "last:border-b-0" : ""}`}
                        t={t}
                      />
                    ))}
                  </>
                ) : null}
              </ul>

              {/* Add item form */}
              <form
                className="grid gap-2 border-t border-[var(--border-muted)] p-4"
                data-list-board-composer="true"
                onSubmit={handleCreateItem}
                onBlur={(event) => {
                  const nextFocused = event.relatedTarget;

                  if (
                    nextFocused instanceof Node &&
                    composerFormRef.current?.contains(nextFocused)
                  ) {
                    return;
                  }

                  setIsComposerFocused(false);
                }}
                onFocus={() => setIsComposerFocused(true)}
                ref={composerFormRef}
              >
                <div className="flex min-w-0 items-center rounded-md border border-[var(--input-border)] bg-[var(--input-background)] focus-within:border-[var(--focus-ring)]">
                  <input
                    ref={newItemInputRef}
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--input-placeholder)] focus:outline-none sm:h-9 sm:text-sm"
                    disabled={isSavingItem}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder={t("addItemPlaceholder")}
                    type="text"
                    value={newItemText}
                  />
                </div>
                {renderComposerFooter ? (
                  renderComposerFooter({
                    canSubmit: Boolean(newItemText.trim()),
                    disabled: isSavingItem,
                    isFocused: isComposerFocused,
                  })
                ) : (
                  <div className="flex justify-end">
                    <button
                      className="h-10 w-full rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-3 text-sm font-medium text-[var(--accent-sage-text)] transition hover:bg-[var(--surface-secondary)] disabled:opacity-50 sm:h-9 sm:w-auto"
                      disabled={isSavingItem || !newItemText.trim()}
                      type="submit"
                    >
                      {t("addItemButton")}
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <p className="font-serif text-lg text-[var(--text-muted)]">{t("emptyStateHeading")}</p>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">{t("emptyStateHint")}</p>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes list-item-enter {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }

          55% {
            opacity: 1;
            transform: translateY(-2px) scale(1.006);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes list-item-complete {
          0% {
            opacity: 1;
            transform: translateY(-2px);
          }

          100% {
            opacity: 1;
            transform: translateY(8px);
          }
        }
      `}</style>
    </div>
  );
}
