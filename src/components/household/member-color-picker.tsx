"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { MemberAvatar } from "@/components/ui/member-avatar";
import { OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import {
  MEMBER_COLORS,
  MEMBER_COLOR_KEYS,
  getMemberColor,
  type MemberColorKey,
} from "@/lib/member-colors";
import { getMemberAvatarText, MEMBER_EMOJI_OPTIONS } from "@/lib/member-avatar";

type UpdateMemberAvatarResult = Readonly<{
  error: string | null;
  success: boolean;
}>;

type MemberColorPickerProps = Readonly<{
  memberEmail: string | null;
  memberId: string;
  memberLabel: string;
  memberName: string | null;
  onSelectedColorChange: (color: MemberColorKey) => void;
  onSelectedEmojiChange: (emoji: string | null) => void;
  selectedColor: string;
  selectedEmoji: string | null;
  showOnboardingHint: boolean;
  storageKey: string;
  updateMemberAction: (formData: FormData) => Promise<UpdateMemberAvatarResult>;
}>;

const MEMBER_COLOR_LABEL_KEYS = {
  blue: "colorBlue",
  clay: "colorClay",
  gold: "colorGold",
  green: "colorGreen",
  mauve: "colorMauve",
  rose: "colorRose",
  teal: "colorTeal",
  violet: "colorViolet",
} as const satisfies Record<MemberColorKey, string>;

export function MemberColorPicker({
  memberEmail,
  memberId,
  memberLabel,
  memberName,
  onSelectedColorChange,
  onSelectedEmojiChange,
  selectedColor,
  selectedEmoji,
  showOnboardingHint,
  storageKey,
  updateMemberAction,
}: MemberColorPickerProps) {
  const t = useTranslations("householdPage");
  const currentColor = getMemberColor(selectedColor).key;
  const [previewColor, setPreviewColor] = useState<MemberColorKey | null>(null);
  const [previewEmoji, setPreviewEmoji] = useState<string | null | undefined>(undefined);
  const initialText = getMemberAvatarText({
    email: memberEmail,
    name: memberName,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!showOnboardingHint || typeof window === "undefined") {
      return false;
    }

    try {
      return !window.localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function dismissOnboarding() {
    setShowOnboarding(false);

    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {}
  }

  function updateAvatar(nextColor: MemberColorKey, nextEmoji: string | null) {
    const previousColor = currentColor;
    const previousEmoji = selectedEmoji;
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("color", nextColor);
    formData.set("emoji", nextEmoji ?? "");

    onSelectedColorChange(nextColor);
    onSelectedEmojiChange(nextEmoji);
    setError(null);

    startTransition(() => {
      void updateMemberAction(formData)
        .then((result) => {
          if (!result.success) {
            onSelectedColorChange(previousColor);
            onSelectedEmojiChange(previousEmoji);
            setError(result.error);
          }
        })
        .catch(() => {
          onSelectedColorChange(previousColor);
          onSelectedEmojiChange(previousEmoji);
          setError(t("errorAvatarSave"));
        });
    });
  }

  return (
    <div className="relative shrink-0 pt-0.5" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("editAvatarAria", { name: memberLabel })}
        className="group relative rounded-md transition hover:scale-[1.03] disabled:opacity-60"
        disabled={isPending}
        onClick={() => {
          if (showOnboarding) dismissOnboarding();
          setError(null);
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <MemberAvatar
          className="flex h-10 w-10 items-center justify-center rounded-md border text-base font-semibold transition-[filter] group-hover:brightness-[0.84]"
          color={previewColor ?? selectedColor}
          email={memberEmail}
          emoji={previewEmoji === undefined ? selectedEmoji : previewEmoji}
          fallbackLabel={t("unknownMember")}
          name={memberName}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/0 text-[var(--text-on-strong)] opacity-0 transition-[background-color,opacity] group-hover:bg-black/20 group-hover:opacity-100">
          <Pencil aria-hidden className="h-3.5 w-3.5" />
        </span>
      </button>

      {showOnboarding ? (
        <OnboardingTooltip className="absolute left-full top-1/2 z-30 ml-4 -translate-y-1/2">
          {t("avatarOnboardingHint")}
        </OnboardingTooltip>
      ) : null}

      {isOpen ? (
        <div
          aria-label={t("avatarOptionsAria", { name: memberLabel })}
          className="absolute left-0 top-full z-20 mt-2 w-[228px] rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 shadow-[var(--shadow-float)]"
          role="dialog"
        >
          <div className="mb-3">
            <p className="text-center text-xs font-semibold uppercase tracking-normal text-[var(--accent-rose-text)]">
              {t("avatarTitle")}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                aria-label={t("useInitialAria", { name: memberLabel })}
                aria-pressed={selectedEmoji === null}
                className={`flex h-11 items-center justify-center rounded-md border text-[11px] font-semibold transition ${
                  selectedEmoji === null
                    ? "border-[var(--text-strong)] bg-[var(--surface-secondary)] text-[var(--text-strong)]"
                    : "border-[var(--input-border)] bg-[var(--input-background)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                }`}
                onBlur={() => setPreviewEmoji(undefined)}
                onClick={() => updateAvatar(currentColor, null)}
                onFocus={() => setPreviewEmoji(null)}
                onMouseEnter={() => setPreviewEmoji(null)}
                onMouseLeave={() => setPreviewEmoji(undefined)}
                type="button"
              >
                {initialText}
              </button>
              {MEMBER_EMOJI_OPTIONS.map((emoji) => (
                <button
                  aria-label={t("useEmojiAria", { emoji, name: memberLabel })}
                  aria-pressed={selectedEmoji === emoji}
                  className={`relative flex h-11 items-center justify-center rounded-md border text-xl transition ${
                    selectedEmoji === emoji
                      ? "border-[var(--text-strong)] bg-[var(--surface-secondary)] shadow-[inset_0_0_0_1px_rgba(32,35,33,0.16)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                      : "border-[var(--input-border)] bg-[var(--input-background)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                  }`}
                  key={emoji}
                  onBlur={() => setPreviewEmoji(undefined)}
                  onClick={() => updateAvatar(currentColor, emoji)}
                  onFocus={() => setPreviewEmoji(emoji)}
                  onMouseEnter={() => setPreviewEmoji(emoji)}
                  onMouseLeave={() => setPreviewEmoji(undefined)}
                  type="button"
                >
                  <span aria-hidden>{emoji}</span>
                  {selectedEmoji === emoji ? (
                    <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[9px] font-bold text-[var(--text-on-strong)]">
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="border-t border-[var(--border-muted)]" />

            <div className="grid grid-cols-4 gap-1.5">
              {MEMBER_COLOR_KEYS.map((key) => {
                const color = MEMBER_COLORS[key];
                const colorName = t(MEMBER_COLOR_LABEL_KEYS[key]);
                const isSelected = key === currentColor;

                return (
                  <button
                    aria-label={t("useColorAria", { color: colorName, name: memberLabel })}
                    aria-pressed={isSelected}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-md border transition hover:scale-[1.03] ${
                      isSelected
                        ? "border-[var(--text-strong)] shadow-[inset_0_0_0_1px_rgba(32,35,33,0.16)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                        : ""
                    }`}
                    key={key}
                    onBlur={() => setPreviewColor(null)}
                    onClick={() => updateAvatar(key, selectedEmoji)}
                    onFocus={() => setPreviewColor(key)}
                    onMouseEnter={() => setPreviewColor(key)}
                    onMouseLeave={() => setPreviewColor(null)}
                    style={{
                      backgroundColor: color.hex,
                      borderColor: isSelected ? "var(--text-strong)" : color.border,
                    }}
                    title={colorName}
                    type="button"
                  >
                    {isSelected ? (
                      <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[9px] font-bold text-[var(--text-on-strong)]">
                        ✓
                      </span>
                    ) : null}
                    <span className="sr-only">{colorName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="mt-3 text-[11px] font-medium text-[var(--accent-rose-text)]">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
