"use client";

import type { ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

type AppShellFrameProps = Readonly<{
  children: ReactNode;
  memberColor: string | null;
  memberEmoji: string | null;
  userName: string | null;
}>;

export function AppShellFrame({ children, memberColor, memberEmoji, userName }: AppShellFrameProps) {
  return (
    <div
      className="flex flex-col gap-5 sm:grid sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start sm:gap-x-10 sm:gap-y-8 xl:grid-cols-[14rem_minmax(0,980px)_minmax(0,max(0px,min(14rem,calc(100%_-_14rem_-_980px_-_5rem))))]"
    >
      <AppNavigation
        memberColor={memberColor}
        memberEmoji={memberEmoji}
        userName={userName}
      />
      <div className="min-w-0 sm:col-start-2 sm:pl-10 xl:col-start-2">
        <div className="w-full xl:max-w-[980px]">{children}</div>
      </div>
    </div>
  );
}
