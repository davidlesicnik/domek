"use client";

import { CalendarDays, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ListBoard } from "@/components/list-board/list-board";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { TodoItemView, TodoListView, TodoMemberView } from "@/lib/todo-lists";

type TodoBoardProps = Readonly<{
  initialLists: TodoListView[];
  members: TodoMemberView[];
}>;

type TodoQuickAddControlsProps = Readonly<{
  canSubmit: boolean;
  disabled: boolean;
  isFocused: boolean;
  members: TodoMemberView[];
  onDueDateChange: (value: string | null) => void;
  onMemberChange: (value: string | null) => void;
  selectedDueDate: string | null;
  selectedMemberId: string | null;
}>;

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  weekday: "short",
});

function memberLabel(member: TodoMemberView) {
  return member.name ?? member.email ?? "Member";
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(dateKey: string, formatter: Intl.DateTimeFormat) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return formatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function TodoQuickAddControls({
  canSubmit,
  disabled,
  isFocused,
  members,
  onDueDateChange,
  onMemberChange,
  selectedDueDate,
  selectedMemberId,
}: TodoQuickAddControlsProps) {
  const [activePopover, setActivePopover] = useState<"member" | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dueDateInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;

  useEffect(() => {
    if (!activePopover) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePopover(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activePopover]);

  if (!isFocused && !selectedMemberId && !selectedDueDate) {
    return null;
  }

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              aria-expanded={activePopover === "member"}
              aria-label={selectedMember ? `Assigned to ${memberLabel(selectedMember)}` : "Assign someone"}
              className={`flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm transition ${
                selectedMember
                  ? "border-[#bfd0c1] bg-[#eef6ef] pr-8 text-[#45614c] hover:bg-[#e2f0e4]"
                  : "border-[#e0dcd4] bg-[#fbfaf6] text-[#5d635f] hover:bg-[#f7f4ec]"
              }`}
              disabled={disabled || members.length === 0}
              onClick={() => setActivePopover((current) => (current === "member" ? null : "member"))}
              type="button"
            >
              {selectedMember ? (
                <MemberAvatar
                  className="flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-semibold"
                  color={selectedMember.color}
                  email={selectedMember.email}
                  emoji={selectedMember.emoji}
                  name={selectedMember.name}
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#8a908c]">
                  <UserRound aria-hidden className="h-4 w-4" />
                </span>
              )}
              <span>{selectedMember ? memberLabel(selectedMember) : "Unassigned"}</span>
            </button>
            {selectedMember ? (
              <button
                aria-label="Clear assignee"
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#dbe9dd] text-[#45614c] transition hover:bg-[#cfe2d2]"
                onClick={(event) => {
                  event.stopPropagation();
                  onMemberChange(null);
                }}
                type="button"
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            ) : null}
            {activePopover === "member" ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-2 shadow-[0_18px_45px_rgba(31,35,30,0.16)]">
                <button
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                    selectedMemberId === null
                      ? "bg-[#f4f1ea] text-[#202321]"
                      : "text-[#5d635f] hover:bg-[#f7f4ec]"
                  }`}
                  onClick={() => {
                    onMemberChange(null);
                    setActivePopover(null);
                  }}
                  type="button"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#d8d2c8] bg-white text-[#8a908c]">
                    <UserRound aria-hidden className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">No assignee</span>
                  {selectedMemberId === null ? <span className="text-xs font-semibold text-[#45614c]">Selected</span> : null}
                </button>
                <div className="my-2 border-t border-[#eee9df]" />
                <div className="grid gap-1">
                  {members.map((member) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                        selectedMemberId === member.id
                          ? "bg-[#eef6ef] text-[#202321]"
                          : "text-[#5d635f] hover:bg-[#f7f4ec]"
                      }`}
                      key={member.id}
                      onClick={() => {
                        onMemberChange(member.id);
                        setActivePopover(null);
                      }}
                      type="button"
                    >
                      <MemberAvatar
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold"
                        color={member.color}
                        email={member.email}
                        emoji={member.emoji}
                        name={member.name}
                      />
                      <span className="min-w-0 flex-1 truncate">{memberLabel(member)}</span>
                      {selectedMemberId === member.id ? <span className="text-xs font-semibold text-[#45614c]">Selected</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              aria-label={selectedDueDate ? `Due ${formatDateLabel(selectedDueDate, fullDateFormatter)}` : "Add due date"}
              className={`flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm transition ${
                selectedDueDate
                  ? "border-[#ded3a1] bg-[#fbf4cf] pr-8 text-[#64571f] hover:bg-[#f6eab5]"
                  : "border-[#e0dcd4] bg-[#fbfaf6] text-[#5d635f] hover:bg-[#f7f4ec]"
              }`}
              disabled={disabled}
              onClick={() => {
                const input = dueDateInputRef.current;

                if (!input) {
                  return;
                }

                input.focus();

                if (typeof input.showPicker === "function") {
                  input.showPicker();
                  return;
                }

                input.click();
              }}
              type="button"
            >
              <CalendarDays aria-hidden className="h-4 w-4" />
              <span>{selectedDueDate ? formatDateLabel(selectedDueDate, compactDateFormatter) : "No due date"}</span>
            </button>
            {selectedDueDate ? (
              <button
                aria-label="Clear due date"
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#efe6b3] text-[#64571f] transition hover:bg-[#e5db9e]"
                onClick={(event) => {
                  event.stopPropagation();
                  onDueDateChange(null);
                }}
                type="button"
              >
                <X aria-hidden className="h-3 w-3" />
              </button>
            ) : null}
            <input
              className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
              min={todayDateKey()}
              onChange={(event) => onDueDateChange(event.target.value || null)}
              ref={dueDateInputRef}
              tabIndex={-1}
              type="date"
              value={selectedDueDate ?? ""}
            />
          </div>
        </div>

        <button
          className="h-9 shrink-0 rounded-md border border-[#c9d7cc] bg-[#eef6ef] px-3 text-sm font-medium text-[#45614c] transition hover:bg-[#e2f0e4] disabled:opacity-50"
          disabled={disabled || !canSubmit}
          type="submit"
        >
          Add
        </button>
      </div>

    </div>
  );
}

function TodoItemMeta({ item }: { item: TodoItemView }) {
  const todayKey = todayDateKey();
  const isOverdue = Boolean(item.dueDate && !item.done && item.dueDate < todayKey);
  const isDueToday = Boolean(item.dueDate && !item.done && item.dueDate === todayKey);

  if (!item.assignedHouseholdMemberId && !item.dueDate) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {item.assignedHouseholdMemberId ? (
        <span className="inline-flex items-center rounded-full bg-[#f8faf7] px-1 py-0.5 text-[11px] font-medium text-[#5d6860]">
          <MemberAvatar
            className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-[rgba(93,104,96,0.14)] text-[8px] font-semibold"
            color={item.assignedHouseholdMemberColor}
            email={item.assignedHouseholdMemberEmail}
            emoji={item.assignedHouseholdMemberEmoji}
            name={item.assignedHouseholdMemberName}
            title={item.assignedHouseholdMemberName ?? item.assignedHouseholdMemberEmail ?? "Assigned"}
          />
        </span>
      ) : null}

      {item.dueDate ? (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
            isOverdue
              ? "bg-[#fdf3f1] text-[#9c4636]"
              : isDueToday
                ? "bg-[#f6f2dd] text-[#8a7440]"
                : "bg-[#fbfaf6] text-[#8a8677]"
          }`}
        >
          <CalendarDays aria-hidden className="h-3 w-3" />
          <span>{formatDateLabel(item.dueDate, fullDateFormatter)}</span>
        </span>
      ) : null}
    </div>
  );
}

export function TodoBoard({ initialLists, members }: TodoBoardProps) {
  const [composerResetKey, setComposerResetKey] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;

  return (
    <ListBoard<TodoItemView>
      analyticsArea="todo"
      createItemInput={(text) => ({
        assignedHouseholdMemberId: selectedMemberId,
        dueDate: selectedDueDate,
        text,
      })}
      createOptimisticItem={({ id, text }) => ({
        assignedHouseholdMemberColor: selectedMember?.color ?? null,
        assignedHouseholdMemberEmail: selectedMember?.email ?? null,
        assignedHouseholdMemberEmoji: selectedMember?.emoji ?? null,
        assignedHouseholdMemberId: selectedMemberId,
        assignedHouseholdMemberName: selectedMember?.name ?? null,
        done: false,
        dueDate: selectedDueDate,
        id,
        text,
      })}
      initialLists={initialLists}
      itemsPath="/api/todos/items"
      listsPath="/api/todos/lists"
      onItemCreated={() => {
        setSelectedDueDate(null);
        setSelectedMemberId(null);
        setComposerResetKey((current) => current + 1);
      }}
      renderComposerFooter={({ canSubmit, disabled, isFocused }) => (
        <TodoQuickAddControls
          canSubmit={canSubmit}
          disabled={disabled}
          isFocused={isFocused}
          key={composerResetKey}
          members={members}
          onDueDateChange={setSelectedDueDate}
          onMemberChange={setSelectedMemberId}
          selectedDueDate={selectedDueDate}
          selectedMemberId={selectedMemberId}
        />
      )}
      renderItemMeta={(item) => <TodoItemMeta item={item} />}
      title="To-do"
    />
  );
}
