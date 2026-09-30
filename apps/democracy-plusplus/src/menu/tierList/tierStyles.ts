import type { EditableTier } from "../../types";

export const TIER_LABELS: Record<EditableTier, string> = {
  s: "S",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  uncategorized: "Uncategorized",
};

export const TIER_ACCENTS: Record<EditableTier, string> = {
  s: "#ffb300",
  a: "#a921df",
  b: "#3596fd",
  c: "#08bb00",
  d: "#bdbdbd",
  uncategorized: "#757575",
};
