import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

type AppShellProps = Readonly<{
  authConfigured: boolean;
  userName: string | null;
  children: ReactNode;
}>;

export function AppShell({ authConfigured, userName, children }: AppShellProps) {
  return (
    <div className="min-h-dvh border-t-4 border-[#232323] bg-[#f8f6f1] text-[#202321]">
      <header className="border-b border-[#dfddd6] bg-[#fdfcf8]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase tracking-normal text-[#b94e3f]">
              Domek
            </p>
            <h1 className="font-serif text-2xl font-semibold tracking-normal text-[#171a18]">
              Home board
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-[#5d635f] sm:items-center sm:justify-end">
            <span className="inline-flex h-8 items-center rounded-full bg-[#ebe7df] px-4 text-xs font-semibold">
              {userName ? `Signed in as ${userName}` : "Local setup"}
            </span>
            <a
              className="inline-flex h-8 items-center justify-center rounded-full border border-[#b9cdbc] bg-[#eef7ef] px-5 text-xs font-semibold text-[#526c56] transition hover:bg-[#e1f0e3]"
              href={authConfigured ? "/api/auth/signout" : "#setup"}
            >
              {authConfigured ? "Sign out" : "Set up sign-in"}
            </a>
          </div>
        </div>
        <AppNavigation />
      </header>
      {!authConfigured ? (
        <div className="border-b border-[#e7d9c6] bg-[#fbf5e8] px-4 py-3 text-sm text-[#a6543c]">
          <div className="mx-auto max-w-[1280px]">
            OIDC not configured yet. Add the Auth.js and OIDC values from{" "}
            <code className="rounded bg-[#eee2cf] px-2 py-0.5 text-xs">.env.example</code>{" "}
            before using outside local setup.
          </div>
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
