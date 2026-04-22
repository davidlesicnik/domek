"use client";

import { useState, type ReactNode } from "react";

import { AppNavigation } from "@/components/layout/app-navigation";

type AppShellFrameProps = Readonly<{
  children: ReactNode;
  memberColor: string | null;
  memberEmoji: string | null;
  userName: string | null;
}>;

export function AppShellFrame({ children, memberColor, memberEmoji, userName }: AppShellFrameProps) {
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);

  return (
    <div
      className={`flex flex-col gap-8 sm:grid sm:items-start sm:gap-x-10 sm:gap-y-8 sm:transition-[grid-template-columns] sm:duration-200 sm:ease-out ${
        isNavigationCollapsed
          ? "sm:grid-cols-[4.5rem_minmax(0,1fr)] xl:grid-cols-[4.5rem_minmax(0,980px)_4.5rem]"
          : "sm:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,980px)_14rem]"
      }`}
    >
      <AppNavigation
        collapsed={isNavigationCollapsed}
        memberColor={memberColor}
        memberEmoji={memberEmoji}
        onToggleCollapsed={() => setIsNavigationCollapsed((current) => !current)}
        userName={userName}
      />
      <div
        className={`min-w-0 transition-[padding] duration-200 ease-out sm:col-start-2 xl:col-start-2 ${
          isNavigationCollapsed ? "sm:pl-8" : "sm:pl-10"
        }`}
      >
        <div className="w-full xl:max-w-[980px]">{children}</div>
      </div>
    </div>
  );
}
