import type { EditableTier, Item, Tier } from "../types";

export const TIER_ORDER: Tier[] = ["s", "a", "b", "c", "d"];
export const EDITABLE_TIER_ORDER: EditableTier[] = ["s", "a", "b", "c", "d", "uncategorized"];
export const TIER_COLORS: Record<Tier, string> = {
  s: "#ffb300",
  a: "#a921df",
  b: "#3596fd",
  c: "#08fb00",
  d: "#ffffff",
};

export function getEffectiveTier(item: Item, overrides: Record<string, Tier>) {
  return overrides[item.displayName] ?? item.tier;
}

export function applyTierOverrides<T extends Item>(items: T[], overrides: Record<string, Tier>): T[] {
  return items.map((item) => ({
    ...item,
    tier: getEffectiveTier(item, overrides),
  }));
}

export function buildTierDraft(items: Item[], overrides: Record<string, Tier>) {
  return Object.fromEntries(
    items.map((item) => [item.displayName, getEffectiveTier(item, overrides)]),
  ) as Record<string, EditableTier>;
}

export function sortItemsByTier<T extends Item>(items: T[]) {
  return [...items].sort((left, right) => {
    const tierDifference = TIER_ORDER.indexOf(left.tier) - TIER_ORDER.indexOf(right.tier);
    return tierDifference || left.displayName.localeCompare(right.displayName);
  });
}

export function getSortedWarbondItems(items: Item[], warbondCode: string) {
  return sortItemsByTier(items.filter((item) => item.type !== "Warbond" && item.warbondCode === warbondCode));
}
