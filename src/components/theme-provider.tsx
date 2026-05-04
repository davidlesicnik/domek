"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  setForcedTheme,
}: Readonly<{
  children: ReactNode;
  setForcedTheme: (forcedTheme: ForcedThemeName | undefined) => void;
}>) {
  const { setTheme } = useTheme();

  const value = useMemo<ThemePreferenceController>(
    () => ({
      applyThemePreference(themePreference) {
        setForcedTheme(themePreferenceToForcedTheme(themePreference));
        setTheme(themePreferenceToNextTheme(themePreference));
      },
    }),
    [setTheme, setForcedTheme],
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
      <ThemePreferenceBridge setForcedTheme={setForcedTheme}>{children}</ThemePreferenceBridge>
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
