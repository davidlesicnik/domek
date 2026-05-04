"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("accountDropdown");
  const [isOpen, setIsOpen] = useState(false);
  const label = userName ?? "Domek";
  const firstName = label.trim().split(/\s+/)[0] ?? "Domek";

  return (
    <div className={`relative ${showName ? "w-full" : "w-fit"}`}>
      <button
        aria-expanded={isOpen}
        aria-label={t("ariaLabel")}
        className={`flex cursor-pointer items-center transition ${
          showName
            ? "w-full gap-3 rounded-md py-2.5 pl-0 pr-2 text-left text-[13px] font-medium text-[var(--text-subtle)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            : "h-11 w-11 justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--text-primary)] hover:border-[var(--focus-ring)] hover:bg-[var(--surface-secondary)]"
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
            className={`absolute top-full z-50 mt-2 w-[min(16rem,calc(100vw-2rem))] rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 shadow-[var(--shadow-float)] ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
              {t("signedIn")}
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
              {userName ?? t("householdMember")}
            </p>
            <Link
              className="mt-3 flex h-9 items-center justify-center rounded-md border border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]"
              href="/app/account"
              onClick={() => setIsOpen(false)}
              prefetch={true}
            >
              {t("accountSettings")}
            </Link>
            <form action="/api/auth/signout" className="mt-2" method="post">
              <button
                className="flex h-9 w-full items-center justify-center rounded-md border border-[var(--accent-rose-border)] bg-[var(--accent-rose-soft)] px-4 text-xs font-semibold text-[var(--accent-rose-text)] transition hover:bg-[var(--accent-rose-surface)]"
                type="submit"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
