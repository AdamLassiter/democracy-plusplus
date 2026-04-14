import type { EditableTier, Item, Tier } from "./types";

export const TIER_ORDER: Tier[] = ["s", "a", "b", "c", "d"];
export const EDITABLE_TIER_ORDER: EditableTier[] = ["s", "a", "b", "c", "d", "uncategorized"];

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
