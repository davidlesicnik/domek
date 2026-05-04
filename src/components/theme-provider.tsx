"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { ThemePreference } from "@prisma/client";

import {
  themePreferenceToForcedTheme,
  themePreferenceToNextTheme,
  type ForcedThemeName,
} from "@/lib/theme";

type ThemePreferenceController = Readonly<{
  applyThemePreference: (themePreference: ThemePreference) => void;
}>;

const ThemePreferenceContext = createContext<ThemePreferenceController | null>(null);

function ThemePreferenceBridge({
  children,
  forcedTheme,
  setForcedTheme,
}: Readonly<{
  children: ReactNode;
  forcedTheme: ForcedThemeName | undefined;
  setForcedTheme: (forcedTheme: ForcedThemeName | undefined) => void;
}>) {
  const { setTheme } = useTheme();
  const deferredThemeUpdateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (deferredThemeUpdateTimeoutRef.current !== null) {
        window.clearTimeout(deferredThemeUpdateTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo<ThemePreferenceController>(
    () => ({
      applyThemePreference(themePreference) {
        const nextForcedTheme = themePreferenceToForcedTheme(themePreference);
        const nextTheme = themePreferenceToNextTheme(themePreference);

        if (deferredThemeUpdateTimeoutRef.current !== null) {
          window.clearTimeout(deferredThemeUpdateTimeoutRef.current);
          deferredThemeUpdateTimeoutRef.current = null;
        }

        if (nextForcedTheme === undefined && forcedTheme !== undefined) {
          setForcedTheme(undefined);
          deferredThemeUpdateTimeoutRef.current = window.setTimeout(() => {
            setTheme(nextTheme);
            deferredThemeUpdateTimeoutRef.current = null;
          }, 0);
          return;
        }

        setForcedTheme(nextForcedTheme);
        setTheme(nextTheme);
      },
    }),
    [forcedTheme, setTheme, setForcedTheme],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

type AppThemeProviderProps = Readonly<{
  children: ReactNode;
  forcedTheme?: ForcedThemeName;
}>;

export function AppThemeProvider({ children, forcedTheme: initialForcedTheme }: AppThemeProviderProps) {
  const [forcedTheme, setForcedTheme] = useState<ForcedThemeName | undefined>(initialForcedTheme);

  useEffect(() => {
    setForcedTheme(initialForcedTheme);
  }, [initialForcedTheme]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange={true}
      enableSystem={true}
      forcedTheme={forcedTheme}
    >
      <ThemePreferenceBridge forcedTheme={forcedTheme} setForcedTheme={setForcedTheme}>
        {children}
      </ThemePreferenceBridge>
    </ThemeProvider>
  );
}

export function useThemePreferenceController() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error("useThemePreferenceController must be used within AppThemeProvider");
  }

  return context;
}
