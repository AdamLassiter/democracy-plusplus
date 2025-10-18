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
  return Math.round(cost * (0.9 + 0.2 * Math.random()));
}

function randomChoice(items, n = 1) {
  const shuffled = items.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, n);
  return selected;
}

function chooseOnSale(items, n = 12) {
  const catSaleableItems = items.filter((item) => item.tier !== 'd');
  const guaranteedCategories = Object.entries(Object.groupBy(catSaleableItems, (item) => item.category))
    .forEach((category, catItems) => randomChoice(catItems, 1));
  const randomSaleableItems = calculateItems.filter((item) => !guaranteedCategories.includes(item));
  const randomSale = randomChoice(randomSaleableItems, n - guaranteedCategories.length);
  const saleItems = [...guaranteedCategories, ...randomSale];

  if (saleItems.filter((item) => item.tier === 's').length > 2) {
    return chooseOnSale(items, n);
  } else {
    return saleItems;
  }
}

function sale(cost) {
  return Math.round(cost * 0.5);
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

function calculateItems(items) {
  const onSale = chooseOnSale(items);
  return items.map(item => {
    const baseCost = itemCost(item);
    let cost;
    if (onSale.includes(item)) {
      cost = sale(baseCost);
    } else {
      cost = randomFlux(baseCost);
    }
    return { ...item, cost };
  });
}