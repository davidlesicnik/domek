import type { ReactNode } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";

import { AccountDropdown } from "@/components/layout/account-dropdown";
import { AppShellFrame } from "@/components/layout/app-shell-frame";
import { Footer } from "@/components/layout/footer";
import { HouseholdModalServer } from "@/components/household/household-modal-server";

type AppShellProps = Readonly<{
  banner?: ReactNode;
  memberColor: string | null;
  userName: string | null;
  userId: string;
  children: ReactNode;
}>;

export function AppShell({ banner, memberColor, userName, userId, children }: AppShellProps) {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-row items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
              Domek
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <HouseholdModalServer userId={userId} />
            <div className="flex items-center gap-2 sm:hidden">
              <Link
                aria-label="Household settings"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd9cf] bg-[#f8fbf7] text-[#5d635f] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] hover:text-[#202321]"
                href="/app/household"
              >
                <Settings aria-hidden className="h-4 w-4" />
              </Link>
              <AccountDropdown memberColor={memberColor} userName={userName} />
            </div>
          </div>
        </div>
      </header>
      {banner}
      <main className="mx-auto w-full max-w-[1520px] px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-10">
        <AppShellFrame memberColor={memberColor} userName={userName}>
          {children}
        </AppShellFrame>
      </main>
      <Footer />
    </div>
  );
}
