import type { ReactNode } from "react";

import { AccountDropdown } from "@/components/layout/account-dropdown";
import { AppNavigation } from "@/components/layout/app-navigation";
import { Footer } from "@/components/layout/footer";
import { HouseholdModalServer } from "@/components/household/household-modal-server";

type AppShellProps = Readonly<{
  userName: string | null;
  userId: string;
  children: ReactNode;
}>;

export function AppShell({ userName, userId, children }: AppShellProps) {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-row items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
              Domek
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <HouseholdModalServer userId={userId} />
            <AccountDropdown userName={userName} />
          </div>
        </div>
        <AppNavigation />
      </header>
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
