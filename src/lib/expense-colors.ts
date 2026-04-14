export const EXPENSE_CATEGORY_COLOR_GROUPS = [
  { name: "Rose", base: "#b86f7a", shades: ["#8f3f4d", "#a85863", "#b86f7a", "#cf8d96", "#e3b2b8"] },
  { name: "Clay", base: "#c85b45", shades: ["#97412f", "#b54f3a", "#c85b45", "#dc7b66", "#eca996"] },
  { name: "Gold", base: "#d4bf50", shades: ["#9c8522", "#bda339", "#d4bf50", "#e0cf78", "#ebdda1"] },
  { name: "Green", base: "#6e9274", shades: ["#3f6447", "#557b5d", "#6e9274", "#8cac91", "#b4cdb8"] },
  { name: "Teal", base: "#5a9a97", shades: ["#306966", "#437f7c", "#5a9a97", "#7bb6b3", "#a8d3d0"] },
  { name: "Blue", base: "#5f7fa3", shades: ["#3d5d82", "#4e6e94", "#5f7fa3", "#81a0c0", "#abc3da"] },
  { name: "Violet", base: "#8a78a8", shades: ["#5d4c7d", "#736196", "#8a78a8", "#aa9cc3", "#c9c0da"] },
  { name: "Mauve", base: "#a06a94", shades: ["#714466", "#89577c", "#a06a94", "#bd8ab2", "#d8b1cf"] },
  { name: "Stone", base: "#8b918c", shades: ["#5f6561", "#737a75", "#8b918c", "#aab0ab", "#c9cec9"] },
] as const;

export const EXPENSE_CATEGORY_COLOR_OPTIONS = [
  ...EXPENSE_CATEGORY_COLOR_GROUPS.map((group) => group.base),
  ...EXPENSE_CATEGORY_COLOR_GROUPS.flatMap((group) => group.shades.filter((shade) => shade !== group.base)),
];
