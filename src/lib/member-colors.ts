function mixHex(a: string, b: string, weight: number) {
  const normalizedWeight = Math.max(0, Math.min(1, weight));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);

  return rgbToHex(
    Math.round(ar + (br - ar) * normalizedWeight),
    Math.round(ag + (bg - ag) * normalizedWeight),
    Math.round(ab + (bb - ab) * normalizedWeight),
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export const MEMBER_COLOR_KEYS = [
  "rose",
  "clay",
  "gold",
  "green",
  "teal",
  "blue",
  "violet",
  "mauve",
] as const;

export type MemberColorKey = (typeof MEMBER_COLOR_KEYS)[number];

type MemberColor = Readonly<{
  avatarBg: string;
  avatarText: string;
  border: string;
  dot: string;
  hex: string;
  key: MemberColorKey;
  name: string;
  tint: string;
}>;

const MEMBER_COLOR_HEX: Record<MemberColorKey, { hex: string; name: string }> = {
  blue: { hex: "#5f7fa3", name: "Blue" },
  clay: { hex: "#c85b45", name: "Clay" },
  gold: { hex: "#d4bf50", name: "Gold" },
  green: { hex: "#6e9274", name: "Green" },
  mauve: { hex: "#a06a94", name: "Mauve" },
  rose: { hex: "#b86f7a", name: "Rose" },
  teal: { hex: "#5a9a97", name: "Teal" },
  violet: { hex: "#8a78a8", name: "Violet" },
};

const LEGACY_MEMBER_COLOR_ALIASES: Record<string, MemberColorKey> = {
  "blue-1": "blue",
  "blue-2": "blue",
  "blue-3": "blue",
  "blue-4": "blue",
  "blue-5": "blue",
  "gold-1": "gold",
  "gold-2": "gold",
  "gold-3": "gold",
  "gold-4": "gold",
  "gold-5": "gold",
  "green-1": "green",
  "green-2": "green",
  "green-3": "green",
  "green-4": "green",
  "green-5": "green",
  "mauve-1": "mauve",
  "mauve-2": "mauve",
  "mauve-3": "mauve",
  "mauve-4": "mauve",
  "mauve-5": "mauve",
  "moss": "green",
  "plum": "violet",
  "rose-1": "rose",
  "rose-2": "rose",
  "rose-3": "rose",
  "rose-4": "rose",
  "rose-5": "rose",
  "sage": "green",
  "sky": "blue",
  "stone-1": "blue",
  "stone-2": "blue",
  "stone-3": "blue",
  "stone-4": "blue",
  "stone-5": "blue",
  "teal-1": "teal",
  "teal-2": "teal",
  "teal-3": "teal",
  "teal-4": "teal",
  "teal-5": "teal",
  "violet-1": "violet",
  "violet-2": "violet",
  "violet-3": "violet",
  "violet-4": "violet",
  "violet-5": "violet",
  gold: "gold",
  rose: "rose",
};

export const MEMBER_COLORS: Record<MemberColorKey, MemberColor> = Object.fromEntries(
  MEMBER_COLOR_KEYS.map((key) => {
    const { hex, name } = MEMBER_COLOR_HEX[key];

    return [
      key,
      {
        avatarBg: mixHex(hex, "#ffffff", 0.72),
        avatarText: mixHex(hex, "#1f2321", 0.36),
        border: mixHex(hex, "#ffffff", 0.5),
        dot: hex,
        hex,
        key,
        name,
        tint: mixHex(hex, "#ffffff", 0.88),
      } satisfies MemberColor,
    ];
  }),
) as Record<MemberColorKey, MemberColor>;

export const DEFAULT_MEMBER_COLOR: MemberColorKey = "green";

export function isMemberColorKey(value: string): value is MemberColorKey {
  return value in MEMBER_COLORS || value in LEGACY_MEMBER_COLOR_ALIASES;
}

export function getMemberColor(value: string | null | undefined): MemberColor {
  const key = value ?? "";
  const normalizedKey = LEGACY_MEMBER_COLOR_ALIASES[key] ?? key;

  return normalizedKey in MEMBER_COLORS ? MEMBER_COLORS[normalizedKey as MemberColorKey] : MEMBER_COLORS[DEFAULT_MEMBER_COLOR];
}
