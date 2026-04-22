"use client";

import { useState } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";

export function AccountDropdown({
  align = "right",
  memberColor,
  memberEmoji,
  showName = false,
  userName,
}: {
  align?: "left" | "right";
  memberColor: string | null;
  memberEmoji: string | null;
  showName?: boolean;
  userName: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = userName ?? "Domek";
  const firstName = label.trim().split(/\s+/)[0] ?? "Domek";

  return (
    <div className={`relative ${showName ? "w-full" : "w-fit"}`}>
      <button
        aria-expanded={isOpen}
        aria-label="Account"
        className={`flex cursor-pointer items-center transition ${
          showName
            ? "w-full gap-3 rounded-md py-2.5 pl-0 pr-2 text-left text-[13px] font-medium text-[#7a817d] hover:bg-[#f4f1ea] hover:text-[#202321]"
            : "justify-center hover:opacity-80"
        }`}
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <MemberAvatar
          className={`flex items-center justify-center rounded-md font-semibold ${
            showName ? "h-6 w-6 text-xs" : "h-8 w-8 border text-xs"
          }`}
          color={memberColor}
          emoji={memberEmoji}
          fallbackLabel="Domek"
          name={label}
        />
        {showName ? <span className="min-w-0 flex-1 truncate">{firstName}</span> : null}
      </button>

      {isOpen ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute top-full z-50 mt-2 min-w-64 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-3 shadow-[0_18px_45px_rgba(31,35,30,0.16)] ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
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
