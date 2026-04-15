"use client";

import { useState } from "react";

export function AccountDropdown({ userName }: { userName: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const label = userName ?? "Domek";

  return (
    <div className="relative w-fit">
      <button
        aria-expanded={isOpen}
        aria-label="Account"
        className="flex h-9 cursor-pointer items-center gap-3 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef]"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ebe7df] font-serif text-sm text-[#b94e3f]">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span>Account</span>
      </button>

      {isOpen ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 min-w-64 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-3 shadow-[0_18px_45px_rgba(31,35,30,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
              Signed in
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-[#202321]">
              {userName ?? "Household member"}
            </p>
            <a
              className="mt-3 flex h-9 items-center justify-center rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-4 text-xs font-semibold text-[#202321] transition hover:bg-[#eef7ef]"
              href="/app/account"
              onClick={() => setIsOpen(false)}
            >
              Account settings
            </a>
            <a
              className="mt-2 flex h-9 items-center justify-center rounded-md border border-[#dfb4a8] bg-[#fff5f1] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fbe8df]"
              href="/api/auth/signout"
            >
              Sign out
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
