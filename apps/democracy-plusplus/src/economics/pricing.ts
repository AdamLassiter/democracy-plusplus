import type {
  EquipmentCategory,
  Item,
  StratagemCategory,
  Tier,
} from "../types";

export function tierValue(tier: Tier) {
  return {
    s: 4,
    a: 3,
    b: 2,
    c: 1,
    d: 0,
  }[tier];
}

export function itemCost(item: Item) {
  if (item.overrideCost) {
    return item.overrideCost;
  }
  if (item.category === "crate" && typeof item.cost === "number") {
    return item.cost;
  }
  const costByCategory: Record<EquipmentCategory | StratagemCategory, number> =
    {
      armor: [2, 4, 7, 10, 15][tierValue(item.tier)],
      booster: [1, 4, 8, 14, 20][tierValue(item.tier)],
      primary: [3, 8, 15, 23, 35][tierValue(item.tier)],
      secondary: [2, 5, 8, 16, 24][tierValue(item.tier)],
      throwable: [2, 4, 11, 21, 28][tierValue(item.tier)],
      Defense: [3, 11, 19, 28, 36][tierValue(item.tier)],
      Orbital: [3, 9, 20, 28, 36][tierValue(item.tier)],
      Supply: [3, 9, 18, 27, 36][tierValue(item.tier)],
      Eagle: [3, 10, 21, 26, 36][tierValue(item.tier)],
    };

  if (!item.category || !(item.category in costByCategory)) {
    throw new Error(`Cannot determine shop cost for item: ${item.displayName}`);
  }

  return costByCategory[item.category as EquipmentCategory | StratagemCategory];
}
