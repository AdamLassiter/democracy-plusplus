import { PRNG } from "../economics/lfsr.ts";
import type { ChallengeModeId, EquipmentState, Item } from "../types";

export type ChallengeDefinition = {
  id: ChallengeModeId;
  name: string;
  shortDescription: string;
  help: string;
  economy: boolean;
  editableLoadout: boolean;
};

export const CHALLENGE_DEFINITIONS: Record<ChallengeModeId, ChallengeDefinition> = {
  budget: {
    id: "budget",
    name: "Budget",
    shortDescription: "Earn credits and buy the equipment you can afford.",
    help: "Complete assignments, obey restrictions, earn credits, and build a purchased inventory through the shop.",
    economy: true,
    editableLoadout: true,
  },
  randomizer: {
    id: "randomizer",
    name: "Pure Randomizer",
    shortDescription: "Use the exact loadout assigned for this mission.",
    help: "Every available slot is selected from your owned warbonds. The assignment is locked until the mission is completed.",
    economy: false,
    editableLoadout: false,
  },
  "all-item-knockout": {
    id: "all-item-knockout",
    name: "All-item Knockout",
    shortDescription: "Completed-mission equipment leaves the pool.",
    help: "Choose from every remaining owned item. Empty categories stay forbidden until every category is empty and the whole pool resets.",
    economy: false,
    editableLoadout: true,
  },
  "warbond-knockout": {
    id: "warbond-knockout",
    name: "Warbond Knockout",
    shortDescription: "Use one rotating warbond per mission.",
    help: "Choose from the active warbond plus Basic Training. Each completed mission removes that warbond until the cycle resets.",
    economy: false,
    editableLoadout: true,
  },
};

export function emptyEquipment(): EquipmentState {
  return {
    stratagems: [null, null, null, null],
    primary: null,
    secondary: null,
    throwable: null,
    armorPassive: null,
    booster: null,
  };
}

export function ownedItems(items: Item[], ownedWarbondCodes: string[]) {
  const allowed = new Set(["none", ...ownedWarbondCodes]);
  return items.filter((item) => item.warbondCode && allowed.has(item.warbondCode));
}

function randomItem(items: Item[], prng: PRNG) {
  if (!items.length) return null;
  return items[prng.rand(0, items.length - 1)]?.displayName ?? null;
}

export function randomLoadout(items: Item[], seed: number): EquipmentState {
  const prng = new PRNG(seed);
  function byCategory(category: string) {
    return items.filter((item) => item.category === category);
  }
  const stratagems = items.filter((item) => item.type === "Stratagem");
  const shuffledStratagems = shuffle(stratagems, prng).slice(0, 4).map((item) => item.displayName);

  return {
    primary: randomItem(byCategory("primary"), prng),
    secondary: randomItem(byCategory("secondary"), prng),
    throwable: randomItem(byCategory("throwable"), prng),
    armorPassive: randomItem(byCategory("armor"), prng),
    booster: randomItem(byCategory("booster"), prng),
    stratagems: Array.from({ length: 4 }, (_unused, index) => shuffledStratagems[index] ?? null),
  };
}

export function shuffle<T>(values: T[], prng: PRNG): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = prng.rand(0, index);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function equipmentItems(equipment: EquipmentState) {
  return [
    equipment.primary,
    equipment.secondary,
    equipment.throwable,
    equipment.armorPassive,
    equipment.booster,
    ...equipment.stratagems,
  ].filter((item): item is string => Boolean(item));
}

export function removeUsedItems(remainingItemIds: string[], equipment: EquipmentState) {
  const used = new Set(equipmentItems(equipment));
  return remainingItemIds.filter((item) => !used.has(item));
}

export function prepareItemKnockoutPool(remainingItemIds: string[], eligibleItemIds: string[]) {
  if (remainingItemIds.length) {
    return { reset: false, cycleItemIds: null, remainingItemIds };
  }
  return { reset: true, cycleItemIds: eligibleItemIds, remainingItemIds: eligibleItemIds };
}

export function prepareWarbondKnockoutPool(remainingWarbondCodes: string[], ownedWarbondCodes: string[], seed: number) {
  if (remainingWarbondCodes.length) {
    return { reset: false, cycleWarbondCodes: null, remainingWarbondCodes };
  }
  const next = shuffle(ownedWarbondCodes.filter((code) => code !== "none"), new PRNG(seed));
  return { reset: true, cycleWarbondCodes: next, remainingWarbondCodes: next };
}

export function allowedWarbondItems(items: Item[], activeWarbondCode: string | null) {
  if (!activeWarbondCode) return [];
  return items.filter((item) => item.warbondCode === "none" || item.warbondCode === activeWarbondCode);
}
