"use client";

import { Users } from "lucide-react";

export function HouseholdModalButton() {
  return (
    <a
      className="flex h-9 items-center gap-2 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
      href="/app/household"
    >
      <Users aria-hidden className="h-4 w-4" />
      <span className="hidden sm:inline">Household</span>
    </a>
  );
}
