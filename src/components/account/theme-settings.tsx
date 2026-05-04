"use client";

import { ThemePreference } from "@prisma/client";
import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useThemePreferenceController } from "@/components/theme-provider";

export type ThemePreferenceActionState = Readonly<{
  error: string | null;
  success: boolean;
  themePreference: ThemePreference;
}>;

type ThemeSettingsProps = Readonly<{
  action: (
    prevState: ThemePreferenceActionState,
    formData: FormData,
  ) => Promise<ThemePreferenceActionState>;
  currentThemePreference: ThemePreference;
}>;

export function ThemeSettings({ action, currentThemePreference }: ThemeSettingsProps) {
  const t = useTranslations("accountPage");
  const router = useRouter();
  const { applyThemePreference } = useThemePreferenceController();
  const [state, formAction, pending] = useActionState(action, {
    error: null,
    success: false,
    themePreference: currentThemePreference,
  });

  useEffect(() => {
    if (!state.success) {
      return;
    }

    applyThemePreference(state.themePreference);
    router.refresh();
  }, [applyThemePreference, router, state.success, state.themePreference]);

  const selectedThemePreference = state.themePreference;

  return (
    <section className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-sm font-semibold text-[var(--text-strong)]">{t("themeTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{t("themeDescription")}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          {t("themeCurrent", { theme: t(`themeOption${selectedThemePreference}`) })}
        </p>
      </div>

      <form action={formAction} className="mt-4 grid gap-4">
        <fieldset className="grid gap-2" disabled={pending}>
          <legend className="sr-only">{t("themeLegend")}</legend>
          {([ThemePreference.SYSTEM, ThemePreference.DARK, ThemePreference.LIGHT] as const).map(
            (themePreference) => {
              const checked = selectedThemePreference === themePreference;

              return (
                <label
                  className={`grid cursor-pointer gap-1 rounded-md border px-4 py-3 transition ${
                    checked
                      ? "border-[var(--accent-sage-border)] bg-[var(--accent-sage-surface)] text-[var(--text-strong)]"
                      : "border-[var(--border-muted)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                  } ${pending ? "opacity-70" : ""}`}
                  key={themePreference}
                >
                  <div className="flex items-center gap-3">
                    <input
                      className="h-4 w-4 accent-[var(--accent-sage-strong)]"
                      defaultChecked={checked}
                      name="themePreference"
                      type="radio"
                      value={themePreference}
                    />
                    <span className="text-sm font-semibold text-inherit">
                      {t(`themeOption${themePreference}`)}
                    </span>
                  </div>
                  <span className="pl-7 text-xs leading-5 text-[var(--text-subtle)]">
                    {t(`themeOption${themePreference}Description`)}
                  </span>
                </label>
              );
            },
          )}
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            aria-live="polite"
            className={`text-sm font-medium ${
              state.success ? "text-[var(--accent-sage-text)]" : "text-[var(--accent-rose-text)]"
            }`}
          >
            {state.success
              ? t("themeSaved")
              : state.error === "invalid_theme_preference"
                ? t("themeError")
                : state.error}
          </p>
          <button
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] px-4 text-sm font-semibold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={pending}
            type="submit"
          >
            {pending ? t("themeSaving") : t("themeSave")}
          </button>
        </div>
      </form>
    </section>
  );
}
