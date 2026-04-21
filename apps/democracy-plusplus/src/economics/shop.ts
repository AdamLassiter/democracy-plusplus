import { ITEMS } from "../constants/items";
import { clampPlayerCount } from "../utils/playerCount";
import type { CrateItem, EquipmentCategory, Item, ItemCategory, PlayerCount, ShopItem, StratagemCategory, Tier } from "../types";

function tier(item: { tier: Tier }) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[item.tier];
}

function randomFlux(cost: number) {
  return Math.round(cost * (0.8 + 0.4 * Math.random()));
}

export function calculateItemStock(displayName: string, playerCount: PlayerCount = 1) {
  const infiniteStockItems = [
    "R-2124 Constitution",
    "CQC-73 Entrenchment Tool",
  ];

  if (infiniteStockItems.includes(displayName)) {
    return Infinity;
  }

  return clampPlayerCount(playerCount);
}

function randomChoice(items: Item[], n = 1) {
  const shuffled = items.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, n);
  return selected;
}

function chooseOnSale(items: Item[], n = 12) {
  const midTierItems = items.filter((item) => item.tier !== 'd');
  const grouped = Object.groupBy(midTierItems, (item) => item.category ?? "crate") as Partial<Record<ItemCategory, Item[]>>;
  const onSaleByCategory = Object.values(grouped).flatMap((catItems) => catItems ? randomChoice(catItems, 1) : []);
  const notYetOnSale = midTierItems.filter((item) => !onSaleByCategory.includes(item));
  const randomlyOnSale = randomChoice(notYetOnSale, n - onSaleByCategory.length);
  const onSaleItems = [...onSaleByCategory, ...randomlyOnSale];

  if (onSaleItems.filter((item) => item.tier === 's').length > 2) {
    return chooseOnSale(items, n);
  } else {
    return onSaleItems;
  }
}

function sale(cost: number) {
  return Math.round(cost * (0.45 + 0.1 * Math.random()));
}

export function itemCost(item: Item) {
  if (item.overrideCost) {
    return item.overrideCost;
  }
  if (item.category === "crate" && typeof item.cost === "number") {
    return item.cost;
  }
  const costByCategory: Record<EquipmentCategory | StratagemCategory, number> = {
    'armor': [2, 4, 7, 10, 15][tier(item)],
    'booster': [1, 4, 8, 14, 20][tier(item)],
    'primary': [3, 8, 15, 23, 35][tier(item)],
    'secondary': [2, 5, 8, 16, 24][tier(item)],
    'throwable': [2, 4, 11, 21, 28][tier(item)],
    'Defense': [3, 11, 19, 28, 36][tier(item)],
    'Orbital': [3, 9, 20, 28, 36][tier(item)],
    'Supply': [3, 9, 18, 27, 36][tier(item)],
    'Eagle': [3, 10, 21, 26, 36][tier(item)],
  };

  if (!item.category || !(item.category in costByCategory)) {
    throw new Error(`Cannot determine shop cost for item: ${item.displayName}`);
  }

  return costByCategory[item.category as EquipmentCategory | StratagemCategory];
}

export function calculateShopItems(items: Item[]): [ShopItem[], ShopItem[]] {
  const onSale = chooseOnSale(items).map((item): ShopItem => {
    const baseCost = itemCost(item);
    const cost = sale(baseCost);
    return { ...item, cost, onSale: true };
  });
  const notOnSale = items.map((item): ShopItem => {
    const baseCost = itemCost(item);
    const cost = randomFlux(baseCost);
    return { ...item, cost, onSale: false };
  });

  return [onSale, notOnSale];
}

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

export function chooseSupplyCrateContents(crate: CrateItem) {
  return randomChoice([...crate.contents])[0];
}

function tieredCrate(grade: Tier, category: EquipmentCategory | "Stratagem", cost: number): CrateItem {
  const contents = ITEMS.filter((item) => (item.category === category || item.type === category) && tier(item) >= tier({ tier: grade }));
  const images: Record<EquipmentCategory | "Stratagem", string> = {
    "primary": "icons/gun.svg",
    "secondary": "icons/gun.svg",
    "throwable": "icons/gun.svg",
    "armor": "icons/shieldPlus.svg",
    "booster": "icons/shieldPlus.svg",
    "Stratagem": "icons/missile.svg",
  };

  return {
    displayName: `${toTitleCase(grade)}-Tier ${toTitleCase(category)} Crate`,
    type: "Care Package",
    category: "crate",
    tags: ["lootbox"],
    contents,
    warbondCode: "none",
    internalName: `${grade}-${category}-supplycrate`,
    imageUrl: images[category],
    cost,
    tier: grade,
  };
}

export function supplyCrates(): CrateItem[] {
  return [
    tieredCrate('a', 'primary', 20),
    tieredCrate('b', 'primary', 15),
    tieredCrate('c', 'primary', 10),
    tieredCrate('a', 'Stratagem', 25),
    tieredCrate('b', 'Stratagem', 18),
    tieredCrate('c', 'Stratagem', 10),
  ];
}
