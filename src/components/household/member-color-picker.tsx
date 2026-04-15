"use client";

import { useTransition } from "react";

import {
  MEMBER_COLOR_KEYS,
  MEMBER_COLORS,
  getMemberColor,
  type MemberColorKey,
} from "@/lib/member-colors";

type MemberColorPickerProps = Readonly<{
  memberId: string;
  memberLabel: string;
  selectedColor: string;
  onSelectedColorChange: (color: MemberColorKey) => void;
  updateMemberColorAction: (formData: FormData) => Promise<void>;
}>;

export function MemberColorPicker({
  memberId,
  memberLabel,
  onSelectedColorChange,
  selectedColor,
  updateMemberColorAction,
}: MemberColorPickerProps) {
  const currentColor = getMemberColor(selectedColor).key;
  const [isPending, startTransition] = useTransition();

  function updateColor(key: MemberColorKey) {
    const previousColor = currentColor;
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("color", key);

    onSelectedColorChange(key);
    startTransition(() => {
      void updateMemberColorAction(formData).catch(() => onSelectedColorChange(previousColor));
    });
  }

  return (
    <div
      className="mt-2 flex h-7 w-fit items-center gap-1 rounded-md border border-[#ece7dd] bg-[#faf8f2] p-1 leading-none"
      aria-label={`Color for ${memberLabel}`}
      aria-disabled={isPending}
    >
      {MEMBER_COLOR_KEYS.map((key: MemberColorKey) => {
        const color = MEMBER_COLORS[key];
        const isSelected = key === currentColor;

        return (
          <button
            aria-label={`Use ${color.name} for ${memberLabel}`}
            aria-pressed={isSelected}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border p-0 leading-none transition hover:border-[#aeb8af]"
            key={key}
            onClick={() => updateColor(key)}
            style={{
              backgroundColor: color.avatarBg,
              borderColor: isSelected ? color.avatarText : color.border,
            }}
            title={color.name}
            type="button"
          >
            {isSelected ? (
              <span
                aria-hidden
                className="block h-2 w-2 rounded-sm"
                style={{ backgroundColor: color.dot }}
              />
            ) : null}
            <span className="sr-only">{color.name}</span>
          </button>
        );
      })}
    </div>
  );
}
