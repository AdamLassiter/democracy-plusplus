import { ITEMS } from "../constants/items";
import { clampPlayerCount } from "../utils/playerCount";
import type {
  CrateItem,
  Item,
  ItemCategory,
  PlayerCount,
  ShopItem,
} from "../types";
import { itemCost } from "./pricing";
import { buildSupplyCrates } from "./supplyCrates";

export { chooseSupplyCrateContents } from "./supplyCrates";
export { itemCost } from "./pricing";

function randomFlux(cost: number) {
  return Math.round(cost * (0.8 + 0.4 * Math.random()));
}

export function calculateItemStock(
  displayName: string,
  playerCount: PlayerCount = 1,
) {
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
  const midTierItems = items.filter((item) => item.tier !== "d");
  const grouped = Object.groupBy(
    midTierItems,
    (item) => item.category ?? "crate",
  ) as Partial<Record<ItemCategory, Item[]>>;
  const onSaleByCategory = Object.values(grouped).flatMap((catItems) =>
    catItems ? randomChoice(catItems, 1) : [],
  );
  const notYetOnSale = midTierItems.filter(
    (item) => !onSaleByCategory.includes(item),
  );
  const randomlyOnSale = randomChoice(
    notYetOnSale,
    n - onSaleByCategory.length,
  );
  const onSaleItems = [...onSaleByCategory, ...randomlyOnSale];

  if (onSaleItems.filter((item) => item.tier === "s").length > 2) {
    return chooseOnSale(items, n);
  } else {
    return onSaleItems;
  }
}

function sale(cost: number) {
  return Math.round(cost * (0.45 + 0.1 * Math.random()));
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

export function supplyCrates(): CrateItem[] {
  return buildSupplyCrates(ITEMS);
}
