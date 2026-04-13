"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BrushCleaning,
  CalendarDays,
  Home,
  ListTodo,
  NotebookPen,
  ShoppingCart,
} from "lucide-react";

const navigation = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/todos", icon: ListTodo, label: "To-do" },
  { href: "/#shopping", icon: ShoppingCart, label: "Shopping" },
  { href: "/#notes", icon: NotebookPen, label: "Notes" },
  { href: "/#chores", icon: BrushCleaning, label: "Chores" },
  { href: "/#expenses", icon: Banknote, label: "Expenses" },
];

function isActiveNavigationItem(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href;
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <nav className="mx-auto hidden w-full max-w-[1280px] gap-7 overflow-x-auto px-4 sm:flex sm:px-6">
        {navigation.map((item) => {
          const isActive = isActiveNavigationItem(item.href, pathname);
          const className = `whitespace-nowrap border-b-2 px-0 py-4 text-sm font-medium transition ${
            isActive
              ? "border-[#c85b45] text-[#b94e3f]"
              : "border-transparent text-[#4d5451] hover:border-[#cbd9ce] hover:text-[#171a18]"
          }`;

          return (
            <Link className={className} href={item.href} key={item.label}>
              {item.label}
            </Link>
          );
        })}
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
