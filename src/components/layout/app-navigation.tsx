"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  ListTodo,
  NotebookPen,
  Settings,
  ShoppingCart,
} from "lucide-react";

import { AccountDropdown } from "@/components/layout/account-dropdown";

const navigation = [
  { href: "/app", icon: Home, label: "Dashboard" },
  { href: "/app/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/app/todos", icon: ListTodo, label: "To-do" },
  { href: "/app/shopping", icon: ShoppingCart, label: "Shopping" },
  { href: "/app/chores", icon: ClipboardCheck, label: "Chores" },
  { href: "/app/expenses", icon: Banknote, label: "Expenses" },
  { href: "/app/notes", icon: NotebookPen, label: "Notes" },
];

function isActiveNavigationItem(href: string, pathname: string) {
  return href === "/app" ? pathname === "/app" : pathname === href;
}

type AppNavigationProps = Readonly<{
  collapsed: boolean;
  memberColor: string | null;
  memberEmoji: string | null;
  onToggleCollapsed: () => void;
  userName: string | null;
}>;

function SidebarFooterLink({
  collapsed,
  href,
  icon,
  label,
}: Readonly<{
  collapsed: boolean;
  href: string;
  icon: ReactNode;
  label: string;
}>) {
  return (
    <Link
      aria-label={collapsed ? label : undefined}
      className="group inline-flex items-center rounded-md px-2 py-2.5 text-[13px] font-medium text-[#7a817d] transition hover:bg-[#f4f1ea] hover:text-[#202321]"
      href={href}
      title={collapsed ? label : undefined}
    >
      <span className="inline-flex w-4 shrink-0 justify-center text-[#b0b6b1]/70 transition group-hover:text-[#8f9691]">
        {icon}
      </span>
      <span
        aria-hidden={collapsed}
        className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out ${
          collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-[10rem] opacity-100"
        }`}
      >
        {label}
      </span>
      {collapsed ? <span className="sr-only">{label}</span> : null}
    </Link>
  );
}

function SidebarUtilityButton({
  collapsed,
  icon,
  label,
  onClick,
}: Readonly<{
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-label={collapsed ? label : undefined}
      className="group inline-flex items-center rounded-md px-2 py-2 text-xs font-medium text-[#949a96] transition hover:bg-[#f4f1ea] hover:text-[#5d635f]"
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className="inline-flex w-4 shrink-0 justify-center text-[#babfbb]/70 transition group-hover:text-[#949a96]">
        {icon}
      </span>
      <span
        aria-hidden={collapsed}
        className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out ${
          collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-[10rem] opacity-100"
        }`}
      >
        {label}
      </span>
      {collapsed ? <span className="sr-only">{label}</span> : null}
    </button>
  );
}

export function AppNavigation({
  collapsed,
  memberColor,
  memberEmoji,
  onToggleCollapsed,
  userName,
}: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Primary"
        className={`hidden transition-[width] duration-200 ease-out sm:sticky sm:top-8 sm:block sm:self-start ${
          collapsed ? "sm:w-[4.5rem]" : "sm:w-56"
        }`}
      >
        <div
          className={`flex w-full flex-col border-l border-[#ebe7de] transition-[padding] duration-200 ease-out ${
            collapsed ? "gap-2 pl-2" : "gap-2 pl-3"
          }`}
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveNavigationItem(item.href, pathname);
            const className = `relative inline-flex rounded-md text-sm font-medium transition ${
              isActive
                ? "bg-[#ddebe2] text-[#121513] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[#5f816e]"
                : "text-[#666d69] hover:bg-[#f4f1ea] hover:text-[#202321]"
            }`;
            const iconClassName = `h-4 w-4 shrink-0 transition ${
              isActive
                ? "text-[#5f816e]"
                : collapsed
                  ? "text-[#666d69] group-hover:text-[#202321]"
                  : "text-[#aab0ac]/70 group-hover:text-[#888f8a]"
            }`;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`${className} group items-center px-2 py-3 transition-all duration-200 ease-out`}
                href={item.href}
                key={item.label}
                title={collapsed ? item.label : undefined}
              >
                <span className="inline-flex w-4 shrink-0 justify-center">
                  <Icon aria-hidden className={iconClassName} />
                </span>
                <span
                  aria-hidden={collapsed}
                  className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200 ease-out ${
                    collapsed ? "ml-0 max-w-0 opacity-0" : "ml-3 max-w-[10rem] opacity-100"
                  }`}
                >
                  {item.label}
                </span>
                {collapsed ? <span className="sr-only">{item.label}</span> : null}
              </Link>
            );
          })}
          <div className="mt-8 border-t border-[#ebe7de] pt-4">
            <SidebarUtilityButton
              collapsed={collapsed}
              icon={
                collapsed ? (
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronLeft aria-hidden className="h-3.5 w-3.5 shrink-0" />
                )
              }
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapsed}
            />
            <SidebarFooterLink
              collapsed={collapsed}
              href="/app/household"
              icon={<Settings aria-hidden className="h-4 w-4 shrink-0" />}
              label="Household settings"
            />
            <div className="px-2 pt-2">
              <AccountDropdown
                align="left"
                memberColor={memberColor}
                memberEmoji={memberEmoji}
                showName={!collapsed}
                userName={userName}
              />
            </div>
          </div>
        </div>
      </nav>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dfddd6] bg-[#fdfcf8]/95 px-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(31,35,30,0.12)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-7 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveNavigationItem(item.href, pathname);
            const className = `inline-flex h-12 items-center justify-center rounded-md border text-[#5d635f] transition ${
              isActive
                ? "border-[#c85b45] bg-[#f7ecea] text-[#a6543c]"
                : "border-transparent hover:border-[#cbd9ce] hover:bg-[#f4f1ea] hover:text-[#202321]"
            }`;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={className}
                href={item.href}
                key={item.label}
              >
                <Icon aria-hidden className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
