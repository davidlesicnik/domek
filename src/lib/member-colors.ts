export const MEMBER_COLOR_KEYS = ["sage", "rose", "gold", "sky", "plum", "moss"] as const;

export type MemberColorKey = (typeof MEMBER_COLOR_KEYS)[number];

type MemberColor = Readonly<{
  key: MemberColorKey;
  name: string;
  avatarBg: string;
  avatarText: string;
  border: string;
  dot: string;
  tint: string;
}>;

export const MEMBER_COLORS: Record<MemberColorKey, MemberColor> = {
  sage: {
    key: "sage",
    name: "Sage",
    avatarBg: "#edf5ee",
    avatarText: "#2e6641",
    border: "#c8dfcd",
    dot: "#5f9270",
    tint: "#f5faf6",
  },
  rose: {
    key: "rose",
    name: "Rose",
    avatarBg: "#fbefed",
    avatarText: "#9a463e",
    border: "#ecc7c1",
    dot: "#c96d63",
    tint: "#fff7f5",
  },
  gold: {
    key: "gold",
    name: "Gold",
    avatarBg: "#f8f0d9",
    avatarText: "#7a5a14",
    border: "#e7d397",
    dot: "#b99027",
    tint: "#fcf8ea",
  },
  sky: {
    key: "sky",
    name: "Sky",
    avatarBg: "#eaf4f6",
    avatarText: "#315f67",
    border: "#bddde3",
    dot: "#5c9aa5",
    tint: "#f4fafb",
  },
  plum: {
    key: "plum",
    name: "Plum",
    avatarBg: "#f3edf5",
    avatarText: "#684b72",
    border: "#d7c3df",
    dot: "#936fa1",
    tint: "#faf6fb",
  },
  moss: {
    key: "moss",
    name: "Moss",
    avatarBg: "#eef3e4",
    avatarText: "#53672e",
    border: "#d2dfb7",
    dot: "#7d964b",
    tint: "#f7faef",
  },
};

export const DEFAULT_MEMBER_COLOR: MemberColorKey = "sage";

export function isMemberColorKey(value: string): value is MemberColorKey {
  return MEMBER_COLOR_KEYS.includes(value as MemberColorKey);
}

export function getMemberColor(value: string | null | undefined): MemberColor {
  const key = value ?? "";
  return isMemberColorKey(key) ? MEMBER_COLORS[key] : MEMBER_COLORS[DEFAULT_MEMBER_COLOR];
}
