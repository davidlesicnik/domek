import { ThemePreference } from "@prisma/client";

export const themePreferenceValues = [
  ThemePreference.SYSTEM,
  ThemePreference.DARK,
  ThemePreference.LIGHT,
] as const;

export type NextThemeName = "system" | "dark" | "light";
export type ForcedThemeName = Exclude<NextThemeName, "system">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themePreferenceValues.includes(value as ThemePreference);
}

export function themePreferenceToNextTheme(themePreference: ThemePreference): NextThemeName {
  switch (themePreference) {
    case ThemePreference.DARK:
      return "dark";
    case ThemePreference.LIGHT:
      return "light";
    default:
      return "system";
  }
}

export function themePreferenceToForcedTheme(
  themePreference: ThemePreference | null | undefined,
): ForcedThemeName | undefined {
  if (themePreference === ThemePreference.DARK) {
    return "dark";
  }

  if (themePreference === ThemePreference.LIGHT) {
    return "light";
  }

  return undefined;
}
