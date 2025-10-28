import { ITEMS } from "../constants/items";

function tier(item) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[item.tier];
}

function randomFlux(cost) {
  return Math.round(cost * (0.8 + 0.4 * Math.random()));
}

function randomChoice(items, n = 1) {
  const shuffled = items.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, n);
  return selected;
}

function chooseOnSale(items, n = 12) {
  const midTierItems = items.filter((item) => item.tier !== 'd');
  const onSaleByCategory = Object.entries(Object.groupBy(midTierItems, (item) => item.category))
    .flatMap(([, catItems]) => randomChoice(catItems, 1));
  const notYetOnSale = midTierItems.filter((item) => !onSaleByCategory.includes(item));
  const randomlyOnSale = randomChoice(notYetOnSale, n - onSaleByCategory.length);
  const onSaleItems = [...onSaleByCategory, ...randomlyOnSale];

  if (onSaleItems.filter((item) => item.tier === 's').length > 2) {
    return chooseOnSale(items, n);
  } else {
    return onSaleItems;
  }
}

function sale(cost) {
  return Math.round(cost * (0.45 + 0.1 * Math.random()));
}

function itemCost(item) {
  if (item.overrideCost) {
    return item.overrideCost;
  }
  return {
    'armor': [2, 4, 7, 10, 15][tier(item)],
    'booster': [1, 4, 8, 14, 20][tier(item)],
    'primary': [3, 8, 15, 23, 35][tier(item)],
    'secondary': [2, 5, 8, 16, 24][tier(item)],
    'throwable': [2, 4, 11, 21, 28][tier(item)],
    'Defense': [3, 11, 19, 28, 36][tier(item)],
    'Orbital': [3, 9, 20, 28, 36][tier(item)],
    'Supply': [3, 9, 18, 27, 36][tier(item)],
    'Eagle': [3, 10, 21, 26, 36][tier(item)],
  }[item.category];
}

export function calculateShopItems(items) {
  const onSale = chooseOnSale(items).map((item) => {
    const baseCost = itemCost(item);
    const cost = sale(baseCost);
    return { ...item, cost, onSale: true };
  });
  const notOnSale = items.map(item => {
    const baseCost = itemCost(item);
    const cost = randomFlux(baseCost);
    return { ...item, cost, onSale: false };
  });

  return [onSale, notOnSale];
}

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

export function chooseSupplyCrateContents(crate) {
  return randomChoice([...crate.contents])[0];
}

function tieredCrate(grade, category, cost) {
  const contents = ITEMS.filter((item) => (item.category === category || item.type === category) && tier(item) >= tier({ tier: grade }));
  const images = {
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
    category: category,
    tags: ["lootbox"],
    contents,
    warbondCode: "none",
    internalName: `${grade}-${category}-supplycrate`,
    imageUrl: images[category],
    cost,
    tier: grade,
  };
}

export function supplyCrates() {
  return [
    tieredCrate('a', 'primary', 25),
    tieredCrate('b', 'primary', 20),
    tieredCrate('c', 'primary', 15),
    tieredCrate('a', 'Stratagem', 25),
    tieredCrate('b', 'Stratagem', 20),
    tieredCrate('c', 'Stratagem', 15),
  ];
}
