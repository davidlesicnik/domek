"use client";

import { Check, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import type { ChoreMemberView, ChoreView } from "@/lib/chores";
import { getMemberColor } from "@/lib/member-colors";

type ChoreBoardProps = Readonly<{
  initialChores: ChoreView[];
  members: ChoreMemberView[];
}>;

type CreateChoreFormState = {
  assignedHouseholdMemberId: string;
  intervalUnit: "DAYS" | "WEEKS" | "MONTHS";
  intervalValue: string;
  name: string;
};

const DEFAULT_FORM: CreateChoreFormState = {
  assignedHouseholdMemberId: "",
  intervalUnit: "WEEKS",
  intervalValue: "1",
  name: "",
};

function initialForMember(member: ChoreMemberView): string {
  return (member.name ?? member.email ?? "?").slice(0, 1).toUpperCase();
}

function displayNameForMember(member: ChoreMemberView): string {
  return member.name ?? member.email ?? "Household member";
}

function formatIntervalLabel(value: number, unit: "DAYS" | "WEEKS" | "MONTHS") {
  const singular = unit === "DAYS" ? "day" : unit === "WEEKS" ? "week" : "month";
  const plural = `${singular}s`;

  return `Every ${value} ${value === 1 ? singular : plural}`;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfDayUtc(dateIso: string): Date {
  const dueDate = new Date(dateIso);
  return new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
}

function dueDateLabel(dateIso: string) {
  const dueDate = startOfDayUtc(dateIso);
  const daysDiff = Math.floor((dueDate.getTime() - startOfTodayUtc().getTime()) / (24 * 60 * 60 * 1000));

  if (daysDiff < 0) {
    return `${Math.abs(daysDiff)} ${Math.abs(daysDiff) === 1 ? "day" : "days"} overdue`;
  }

  if (daysDiff === 0) {
    return "Due today";
  }

  if (daysDiff === 1) {
    return "Due tomorrow";
  }

  return `Due in ${daysDiff} days`;
}

function isOverdue(dateIso: string): boolean {
  return startOfDayUtc(dateIso).getTime() < startOfTodayUtc().getTime();
}

function compareChores(a: ChoreView, b: ChoreView): number {
  const aOverdue = isOverdue(a.nextDueAt);
  const bOverdue = isOverdue(b.nextDueAt);

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }

  const dueCompare = new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
  if (dueCompare !== 0) return dueCompare;

  return a.name.localeCompare(b.name);
}

export function ChoreBoard({ initialChores, members }: ChoreBoardProps) {
  const [chores, setChores] = useState<ChoreView[]>(initialChores);
  const [form, setForm] = useState<CreateChoreFormState>({
    ...DEFAULT_FORM,
    assignedHouseholdMemberId: members[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [isCompleting, startCompleteTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const orderedChores = useMemo(() => [...chores].sort(compareChores), [chores]);

  function applyChoreUpdate(updatedChore: ChoreView) {
    setChores((current) => {
      const existingIndex = current.findIndex((chore) => chore.id === updatedChore.id);
      if (existingIndex === -1) {
        return [...current, updatedChore].sort(compareChores);
      }

      const next = [...current];
      next[existingIndex] = updatedChore;
      return next.sort(compareChores);
    });
  }

  function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const intervalValue = Number(form.intervalValue);
    const assignedHouseholdMemberId = form.assignedHouseholdMemberId;
    if (!Number.isInteger(intervalValue) || intervalValue < 1) {
      setError("Set a repeat interval of at least 1.");
      return;
    }

    startCreateTransition(async () => {
      const response = await fetch("/api/chores", {
        body: JSON.stringify({
          assignedHouseholdMemberId,
          intervalUnit: form.intervalUnit,
          intervalValue,
          name: form.name,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setError("Could not create chore. Please try again.");
        return;
      }

      const payload = (await response.json()) as { chore: ChoreView };
      applyChoreUpdate(payload.chore);
      setForm({
        ...DEFAULT_FORM,
        assignedHouseholdMemberId,
      });
    });
  }

  function markComplete(choreId: string) {
    setError(null);

    startCompleteTransition(async () => {
      const response = await fetch(`/api/chores/${choreId}/completions`, {
        method: "POST",
      });

      if (!response.ok) {
        setError("Could not mark chore complete. Please try again.");
        return;
      }

      const payload = (await response.json()) as { chore: ChoreView };
      applyChoreUpdate(payload.chore);
    });
  }

  function removeChore(choreId: string) {
    setError(null);

    startDeleteTransition(async () => {
      const response = await fetch(`/api/chores/${choreId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError("Could not delete chore. Please try again.");
        return;
      }

      setChores((current) => current.filter((chore) => chore.id !== choreId));
    });
  }

  const formDisabled = isCreating || isCompleting || isDeleting || members.length === 0;

  return (
    <div className="grid gap-6">
      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8] p-5">
        <div className="max-w-2xl">
          <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#a6543c]">
            Chores
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
            Keep the home rhythm steady
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#686e6a]">
            Track repeating jobs in one shared list. Overdue chores rise to the top, then slide back
            into their next due spot when checked off.
          </p>
        </div>

        <form className="mt-5 grid gap-3 md:grid-cols-12" onSubmit={onCreateSubmit}>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-name">
              Name
            </label>
            <input
              className="h-10 w-full rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
              id="chore-name"
              maxLength={200}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Unload the dishwasher"
              required
              value={form.name}
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-person">
              Person
            </label>
            <select
              className="h-10 w-full rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
              id="chore-person"
              onChange={(event) =>
                setForm((current) => ({ ...current, assignedHouseholdMemberId: event.target.value }))
              }
              required
              value={form.assignedHouseholdMemberId}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {displayNameForMember(member)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-interval-value">
              Every
            </label>
            <input
              className="h-10 w-full rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
              id="chore-interval-value"
              inputMode="numeric"
              min={1}
              onChange={(event) => setForm((current) => ({ ...current, intervalValue: event.target.value }))}
              required
              type="number"
              value={form.intervalValue}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#3c413e]" htmlFor="chore-interval-unit">
              Unit
            </label>
            <select
              className="h-10 w-full rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-sm text-[#202321] outline-none transition focus:border-[#6e9274] focus:bg-white"
              id="chore-interval-unit"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  intervalUnit: event.target.value as "DAYS" | "WEEKS" | "MONTHS",
                }))
              }
              required
              value={form.intervalUnit}
            >
              <option value="DAYS">Days</option>
              <option value="WEEKS">Weeks</option>
              <option value="MONTHS">Months</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-1">
            <button
              className="h-10 w-full rounded-md bg-[#232323] px-4 text-sm font-semibold text-white transition hover:bg-[#3c413e] disabled:opacity-50"
              disabled={formDisabled}
              type="submit"
            >
              Add
            </button>
          </div>
        </form>

        {members.length === 0 ? (
          <p className="mt-3 text-xs text-[#a6543c]">Add a household member before creating chores.</p>
        ) : null}

        {error ? <p className="mt-3 text-xs font-medium text-[#a6543c]">{error}</p> : null}
      </section>

      <section className="rounded-md border border-[#dedbd2] bg-[#fffdf8]">
        {orderedChores.length === 0 ? (
          <p className="p-5 text-sm text-[#686e6a]">
            No chores yet. Add your first repeating task to start the home board rhythm.
          </p>
        ) : (
          <ul className="divide-y divide-[#eee9df]">
            {orderedChores.map((chore) => {
              const member = members.find((entry) => entry.id === chore.assignedHouseholdMemberId);
              const memberColor = getMemberColor(member?.color ?? chore.assignedHouseholdMemberColor);
              const memberName = member
                ? displayNameForMember(member)
                : (chore.assignedHouseholdMemberName ?? "Unassigned");
              const choreIsOverdue = isOverdue(chore.nextDueAt);

              return (
                <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={chore.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-[#171a18]">{chore.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#646b67]">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border font-serif text-[11px] font-semibold"
                        style={{
                          backgroundColor: memberColor.avatarBg,
                          borderColor: memberColor.border,
                          color: memberColor.avatarText,
                        }}
                        title={memberName}
                      >
                        {member ? initialForMember(member) : memberName.slice(0, 1).toUpperCase()}
                      </span>
                      <span>{memberName}</span>
                      <span className="text-[#a9ada9]">•</span>
                      <span>{formatIntervalLabel(chore.intervalValue, chore.intervalUnit)}</span>
                      <span className="text-[#a9ada9]">•</span>
                      <span className={choreIsOverdue ? "font-semibold text-[#a6543c]" : ""}>
                        {dueDateLabel(chore.nextDueAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#3c413e] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] disabled:opacity-50"
                      disabled={isCompleting || isDeleting}
                      onClick={() => markComplete(chore.id)}
                      type="button"
                    >
                      <Check aria-hidden className="h-3.5 w-3.5" />
                      Done
                    </button>
                    <button
                      aria-label={`Delete ${chore.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2cbc2] bg-[#fff5f2] text-[#a6543c] transition hover:bg-[#ffe9e3] disabled:opacity-50"
                      disabled={isCompleting || isDeleting}
                      onClick={() => removeChore(chore.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
