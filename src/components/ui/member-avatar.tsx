import type { ComponentPropsWithoutRef } from "react";

import { getMemberAvatarLabel, getMemberAvatarText } from "@/lib/member-avatar";
import { getMemberColor } from "@/lib/member-colors";

type MemberAvatarProps = Readonly<{
  color: string | null | undefined;
  email?: string | null;
  emoji?: string | null;
  fallbackLabel?: string;
  name?: string | null;
  title?: string;
}> &
  Omit<ComponentPropsWithoutRef<"span">, "children" | "color">;

export function MemberAvatar({
  className,
  color,
  email,
  emoji,
  fallbackLabel,
  name,
  title,
}: MemberAvatarProps) {
  const palette = getMemberColor(color);

  return (
    <span
      className={className}
      style={{
        backgroundColor: palette.avatarBg,
        borderColor: palette.border,
        color: palette.avatarText,
      }}
      title={title ?? getMemberAvatarLabel({ email, name }, fallbackLabel)}
    >
      {getMemberAvatarText({ email, emoji, name })}
    </span>
  );
}
