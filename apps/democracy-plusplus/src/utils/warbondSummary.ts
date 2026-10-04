import {
  DAMAGE_TYPE_FILTERS,
  itemMatchesPropertyFilters,
  type PropertyFilterMode,
  type PropertyFilterName,
} from "../constants/filters.ts";
import type { Item, Tier, Warbond } from "../types";
import { ARMOR_LABELS, extractItemCapabilities } from "./capabilities.ts";
import { TIER_ORDER } from "./tierList.ts";

export const WARBOND_BEST_CATEGORIES = [
  { category: "primary", label: "Primary" },
  { category: "secondary", label: "Secondary" },
  { category: "throwable", label: "Throwable" },
  { category: "armor", label: "Armor" },
  { category: "stratagem", label: "Stratagem" },
  { category: "booster", label: "Booster" },
] as const;

export type WarbondBestCategory = (typeof WARBOND_BEST_CATEGORIES)[number]["category"];
export type WarbondBestTierFilters = Partial<Record<WarbondBestCategory, Tier[]>>;
export type WarbondDamageType = (typeof DAMAGE_TYPE_FILTERS)[number];

export type WarbondSummary = {
  itemCount: number;
  bestTiers: Partial<Record<WarbondBestCategory, Tier>>;
  armorPenetrationValues: number[];
  armorPenetrationLabels: string[];
  demolitionForceValues: number[];
  destroysSpawners: boolean;
  damageTypes: WarbondDamageType[];
};

function getWarbondItemCategory(item: Item): WarbondBestCategory | null {
  if (item.type === "Stratagem") return "stratagem";
  if (item.category === "primary") return "primary";
  if (item.category === "secondary") return "secondary";
  if (item.category === "throwable") return "throwable";
  if (item.category === "armor") return "armor";
  if (item.category === "booster") return "booster";
  return null;
}

function getBestTier(items: Item[]): Tier | undefined {
  return items.reduce<Tier | undefined>((best, item) => {
    if (!best || TIER_ORDER.indexOf(item.tier) < TIER_ORDER.indexOf(best)) {
      return item.tier;
    }
    return best;
  }, undefined);
}

export function getWarbondSummary(items: Item[], warbondCode: string): WarbondSummary {
  const warbondItems = items.filter(
    (item) => item.type !== "Warbond" && item.warbondCode === warbondCode,
  );
  const bestTiers = Object.fromEntries(WARBOND_BEST_CATEGORIES.flatMap(({ category }) => {
    const bestTier = getBestTier(
      warbondItems.filter((item) => getWarbondItemCategory(item) === category),
    );
    return bestTier ? [[category, bestTier]] : [];
  })) as Partial<Record<WarbondBestCategory, Tier>>;
  const capabilities = warbondItems.flatMap((item) => extractItemCapabilities(item));
  const armorPenetrationValues = [...new Set(capabilities.flatMap(({ armorPenetration }) =>
      armorPenetration === null ? [] : [armorPenetration],
  ))].sort((left, right) => left - right);
  const demolitionForceValues = [...new Set(capabilities.flatMap(({ demolitionForce }) =>
    demolitionForce === null ? [] : [demolitionForce],
  ))].sort((left, right) => left - right);
  const destroysSpawners = warbondItems.some((item) =>
    itemMatchesPropertyFilters(item, ["Destroys Spawners"]),
  );
  const damageTypes = DAMAGE_TYPE_FILTERS.filter((damageType) =>
    warbondItems.some((item) => itemMatchesPropertyFilters(item, [damageType])),
  );

  return {
    itemCount: warbondItems.length,
    bestTiers,
    armorPenetrationValues,
    armorPenetrationLabels: armorPenetrationValues.map(
      (value) => ARMOR_LABELS[value] ?? `AP ${value}`,
    ),
    demolitionForceValues,
    destroysSpawners,
    damageTypes,
  };
}

export function warbondSummaryMatchesFilters(
  summary: WarbondSummary,
  selectedPropertyFilters: readonly PropertyFilterName[],
  selectedBestTierFilters: WarbondBestTierFilters,
  filterMode: PropertyFilterMode = "or",
) {
  const matchesBestTiers = WARBOND_BEST_CATEGORIES.every(({ category }) => {
    const selectedTiers = selectedBestTierFilters[category] ?? [];
    return selectedTiers.length === 0
      || (summary.bestTiers[category] !== undefined
        && selectedTiers.includes(summary.bestTiers[category]));
  });
  if (!matchesBestTiers || selectedPropertyFilters.length === 0) {
    return matchesBestTiers;
  }

  return itemMatchesPropertyFilters({
    displayName: "Warbond summary",
    tier: "d",
    tags: summary.destroysSpawners ? ["Destroys Spawners"] : [],
    properties: {
      summary: {
        Penetration: { Direct: summary.armorPenetrationLabels },
        Damage: { "Demolition Force": summary.demolitionForceValues },
      },
      damageTypes: summary.damageTypes,
    },
  }, selectedPropertyFilters, filterMode);
}

export function filterWarbondsBySummary(
  warbonds: Warbond[],
  items: Item[],
  selectedPropertyFilters: readonly PropertyFilterName[],
  selectedBestTierFilters: WarbondBestTierFilters,
  filterMode: PropertyFilterMode = "or",
) {
  return warbonds.filter((warbond) => warbondSummaryMatchesFilters(
    getWarbondSummary(items, warbond.warbondCode),
    selectedPropertyFilters,
    selectedBestTierFilters,
    filterMode,
  ));
}
