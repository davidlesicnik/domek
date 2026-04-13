"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/todos", label: "To-do" },
  { href: "/#shopping", label: "Shopping" },
  { href: "/#notes", label: "Notes" },
  { href: "/#chores", label: "Chores" },
  { href: "/#expenses", label: "Expenses" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex w-full max-w-[1280px] gap-7 overflow-x-auto px-4 sm:px-6">
      {navigation.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname === item.href;
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
  );
}
