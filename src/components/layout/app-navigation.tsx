"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Banknote,
  ClipboardCheck,
  Home,
  ListTodo,
  NotebookPen,
  Settings,
  ShoppingCart,
} from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/i18n/routing";
import { AccountDropdown } from "@/components/layout/account-dropdown";

const appPrefetchRefreshMs = 4 * 60 * 1000;

function isActiveNavigationItem(href: string, pathname: string) {
  const pathWithoutLocale = stripLocalePrefix(pathname);
  return href === "/app" ? pathWithoutLocale === "/app" : pathWithoutLocale === href;
}

function isUnmodifiedPrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}

type AppNavigationProps = Readonly<{
  memberColor: string | null;
  memberEmoji: string | null;
  userName: string | null;
}>;

function SidebarFooterLink({
  href,
  icon,
  label,
}: Readonly<{
  href: string;
  icon: ReactNode;
  label: string;
}>) {
  return (
    <Link
      className="group inline-flex items-center rounded-md px-2 py-2.5 text-[13px] font-medium text-[#7a817d] transition hover:bg-[#f4f1ea] hover:text-[#202321]"
      href={href as "/app/household"}
      prefetch={true}
    >
      <span className="inline-flex w-4 shrink-0 justify-center text-[#b0b6b1]/70 transition group-hover:text-[#8f9691]">
        {icon}
      </span>
      <span className="ml-3 overflow-hidden whitespace-nowrap">{label}</span>
    </Link>
  );
}

export function AppNavigation({
  memberColor,
  memberEmoji,
  userName,
}: AppNavigationProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<{
    fromPathname: string;
    href: string;
  } | null>(null);

  const navigation = [
    { href: "/app", icon: Home, label: t("dashboard") },
    { href: "/app/todos", icon: ListTodo, label: t("todos") },
    { href: "/app/shopping", icon: ShoppingCart, label: t("shopping") },
    { href: "/app/chores", icon: ClipboardCheck, label: t("chores") },
    { href: "/app/expenses", icon: Banknote, label: t("expenses") },
    { href: "/app/notes", icon: NotebookPen, label: t("notes") },
  ] as const;

  const appPrefetchHrefs = [
    ...navigation.map((item) => item.href),
    "/app/account" as const,
    "/app/household" as const,
  ];

  useEffect(() => {
    const warmAppRoute = (href: string) => {
      if (href !== pathname) {
        router.prefetch(href);
      }
    };
    const warmAppRoutes = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      for (const href of appPrefetchHrefs) {
        warmAppRoute(href);
      }
    };

    if ("requestIdleCallback" in window) {
      const idleCallbackId = window.requestIdleCallback(warmAppRoutes, { timeout: 1200 });
      const intervalId = globalThis.setInterval(warmAppRoutes, appPrefetchRefreshMs);
      return () => {
        window.cancelIdleCallback(idleCallbackId);
        globalThis.clearInterval(intervalId);
      };
    }

    const timeoutId = globalThis.setTimeout(warmAppRoutes, 250);
    const intervalId = globalThis.setInterval(warmAppRoutes, appPrefetchRefreshMs);
    return () => {
      globalThis.clearTimeout(timeoutId);
      globalThis.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router]);

  function handleNavigationClick(href: string, event: MouseEvent<HTMLAnchorElement>) {
    if (isUnmodifiedPrimaryClick(event) && !isActiveNavigationItem(href, pathname)) {
      setPendingNavigation({ fromPathname: pathname, href });
    }
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="hidden sm:sticky sm:top-8 sm:block sm:w-56 sm:self-start"
      >
        <div className="flex w-full flex-col gap-2 border-l border-[#ebe7de] pl-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveNavigationItem(item.href, pathname);
            const isPending =
              pendingNavigation?.href === item.href &&
              pendingNavigation.fromPathname === pathname;
            const isVisuallyActive = isActive || isPending;
            const className = `relative inline-flex rounded-md text-sm font-medium transition ${
              isVisuallyActive
                ? "bg-[#ddebe2] text-[#121513] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-full before:bg-[#5f816e]"
                : "text-[#666d69] hover:bg-[#f4f1ea] hover:text-[#202321]"
            }`;
            const iconClassName = `h-4 w-4 shrink-0 transition ${
              isVisuallyActive
                ? "text-[#5f816e]"
                : "text-[#aab0ac]/70 group-hover:text-[#888f8a]"
            }`;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`${className} group items-center px-2 py-3 transition-all duration-200 ease-out`}
                href={item.href}
                key={item.label}
                onClick={(event) => handleNavigationClick(item.href, event)}
                prefetch={true}
              >
                <span className="inline-flex w-4 shrink-0 justify-center">
                  <Icon aria-hidden className={iconClassName} />
                </span>
                <span className="ml-3 overflow-hidden whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
          <div className="mt-8 border-t border-[#ebe7de] pt-4">
            <SidebarFooterLink
              href="/app/household"
              icon={<Settings aria-hidden className="h-4 w-4 shrink-0" />}
              label={t("householdSettings")}
            />
            <div className="px-2 pt-2">
              <AccountDropdown
                align="left"
                memberColor={memberColor}
                memberEmoji={memberEmoji}
                showName={true}
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
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveNavigationItem(item.href, pathname);
            const isPending =
              pendingNavigation?.href === item.href &&
              pendingNavigation.fromPathname === pathname;
            const isVisuallyActive = isActive || isPending;
            const className = `inline-flex h-11 min-w-0 items-center justify-center rounded-md border text-[#5d635f] transition ${
              isVisuallyActive
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
                onClick={(event) => handleNavigationClick(item.href, event)}
                prefetch={true}
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
