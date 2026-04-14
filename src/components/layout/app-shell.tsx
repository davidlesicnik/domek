import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

type AppShellProps = Readonly<{
  userName: string | null;
  children: ReactNode;
}>;

export function AppShell({ userName, children }: AppShellProps) {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-normal text-[#171a18]">
              Domek
            </h1>
          </div>
          <details className="group relative w-fit text-sm text-[#5d635f]">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-3 rounded-md border border-[#cfd9cf] bg-[#f8fbf7] px-3 text-xs font-semibold text-[#202321] transition hover:border-[#9ab59d] hover:bg-[#eef7ef] [&::-webkit-details-marker]:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ebe7df] font-serif text-sm text-[#b94e3f]">
                {(userName ?? "Domek").slice(0, 1).toUpperCase()}
              </span>
              <span>Account</span>
            </summary>
            <div className="absolute right-0 z-50 mt-2 min-w-64 rounded-md border border-[#dedbd2] bg-[#fffdf8] p-3 shadow-[0_18px_45px_rgba(31,35,30,0.16)]">
              <p className="text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
                Signed in
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-[#202321]">
                {userName ?? "Household member"}
              </p>
              <a
                className="mt-3 flex h-9 items-center justify-center rounded-md border border-[#dfb4a8] bg-[#fff5f1] px-4 text-xs font-semibold text-[#a6543c] transition hover:bg-[#fbe8df]"
                href="/api/auth/signout"
              >
                Sign out
              </a>
            </div>
          </details>
        </div>
        <AppNavigation />
      </header>
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
