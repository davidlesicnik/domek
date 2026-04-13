import type { ReactNode } from "react";

type AppShellProps = Readonly<{
  authConfigured: boolean;
  userName: string | null;
  children: ReactNode;
}>;

const navigation = ["Dashboard", "Calendar", "To-do", "Notes", "Chores", "Expenses"];

export function AppShell({ authConfigured, userName, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[#f4f5f6] text-[#161616]">
      <header className="border-b border-[#d7dce2] bg-[#ffffff]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-medium text-[#0f766e]">Domek</p>
            <h1 className="text-2xl font-semibold tracking-normal text-[#161616] sm:text-3xl">
              Household planner
            </h1>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
            <span>{userName ? `Signed in as ${userName}` : "Local setup mode"}</span>
            <a
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#b8c1cc] px-4 font-medium text-[#161616] transition hover:bg-[#eef2f7]"
              href={authConfigured ? "/api/auth/signout" : "#setup"}
            >
              {authConfigured ? "Sign out" : "Configure OIDC"}
            </a>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-8">
          {navigation.map((item) => (
            <a
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#eef2f7]"
              href={item === "Dashboard" ? "/" : `#${item.toLowerCase()}`}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
      </header>
      {!authConfigured ? (
        <div className="border-b border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-sm text-[#9f1239]">
          <div className="mx-auto max-w-7xl">
            OIDC is not configured yet. Add the Auth.js and OIDC environment values from
            `.env.example` before using this outside local setup.
          </div>
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
