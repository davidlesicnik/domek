import type { ReactNode } from "react";
import { AccountDropdown } from "@/components/layout/account-dropdown";
import { AppShellFrame } from "@/components/layout/app-shell-frame";
import { Footer } from "@/components/layout/footer";
import { HouseholdModalServer } from "@/components/household/household-modal-server";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

type AppShellProps = Readonly<{
  banner?: ReactNode;
  memberColor: string | null;
  memberEmoji: string | null;
  userName: string | null;
  userId: string;
  children: ReactNode;
}>;

export function AppShell({ banner, memberColor, memberEmoji, userName, userId, children }: AppShellProps) {
  return (
    <div className="min-h-dvh border-t-4 border-[var(--surface-strong)] bg-[var(--page-background)] text-[var(--text-primary)]">
      <ServiceWorkerRegistration />
      <header className="border-b border-[var(--border-default)] bg-[var(--shell-background)]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="min-w-0 flex-1 sm:flex-none">
            <h1 className="truncate font-serif text-[1.55rem] font-semibold tracking-normal text-[var(--text-strong)] sm:text-3xl">
              Domek
            </h1>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-5">
            <HouseholdModalServer userId={userId} />
            <div className="flex shrink-0 items-center gap-2 sm:hidden">
              <AccountDropdown memberColor={memberColor} memberEmoji={memberEmoji} userName={userName} />
            </div>
          </div>
        </div>
      </header>
      <InstallAppPrompt />
      {banner}
      <main className="mx-auto w-full max-w-[1520px] px-4 pb-[calc(6.75rem_+_env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:py-10">
        <AppShellFrame memberColor={memberColor} memberEmoji={memberEmoji} userName={userName}>
          {children}
        </AppShellFrame>
      </main>
      <Footer />
    </div>
  );
}
