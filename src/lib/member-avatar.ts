type MemberAvatarInput = Readonly<{
  email?: string | null;
  emoji?: string | null;
  name?: string | null;
}>;

export const MEMBER_EMOJI_OPTIONS = ["😄", "😎", "🤖", "👽", "🐸", "🦊", "🐼", "🐙", "🔥", "🍕", "🚀"] as const;

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function splitGraphemes(value: string) {
  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(value), (segment) => segment.segment);
  }

  return Array.from(value);
}

export function normalizeMemberEmoji(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const graphemes = splitGraphemes(trimmed);
  if (graphemes.length !== 1) return null;

  const [grapheme] = graphemes;
  if (!grapheme) return null;
  if (/^[0-9#*]$/u.test(grapheme)) return null;

  return /\p{Emoji}/u.test(grapheme) ? grapheme : null;
}

export function getMemberAvatarLabel(
  { email, name }: Pick<MemberAvatarInput, "email" | "name">,
  fallback = "Household member",
) {
  return name ?? email ?? fallback;
}

export function getMemberAvatarText(input: MemberAvatarInput) {
  return normalizeMemberEmoji(input.emoji) ?? getMemberAvatarLabel(input, "?").slice(0, 1).toUpperCase();
}
