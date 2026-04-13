"use client";

import type { SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationIconProps = SVGProps<SVGSVGElement>;

const navigation = [
  { href: "/", icon: HomeIcon, label: "Dashboard" },
  { href: "/calendar", icon: CalendarIcon, label: "Calendar" },
  { href: "/todos", icon: TodoIcon, label: "To-do" },
  { href: "/#shopping", icon: ShoppingIcon, label: "Shopping" },
  { href: "/#notes", icon: NotesIcon, label: "Notes" },
  { href: "/#chores", icon: ChoresIcon, label: "Chores" },
  { href: "/#expenses", icon: ExpensesIcon, label: "Expenses" },
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

function HomeIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function CalendarIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <rect height="17" rx="2" width="16" x="4" y="5" />
      <path d="M8 12h.01" />
      <path d="M12 12h.01" />
      <path d="M16 12h.01" />
      <path d="M8 16h.01" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function TodoIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="m4 7 2 2 4-4" />
      <path d="M13 7h7" />
      <path d="m4 17 2 2 4-4" />
      <path d="M13 17h7" />
    </svg>
  );
}

function ShoppingIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M6 7h15l-2 8H8L6 3H3" />
      <path d="M9 20h.01" />
      <path d="M18 20h.01" />
    </svg>
  );
}

function NotesIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function ChoresIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M5 12h14" />
      <path d="M8 12v8" />
      <path d="M16 12v8" />
      <path d="M7 20h10" />
      <path d="m9 12 2-8h2l2 8" />
    </svg>
  );
}

function ExpensesIcon(props: NavigationIconProps) {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M4 7h16v12H4z" />
      <path d="M16 7V5H8v2" />
      <path d="M12 11v4" />
      <path d="M10.5 13h3" />
    </svg>
  );
}
