function tier(item) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[item.tier];
}

function itemCost(item) {
  return {
    'armor': 3 + tier(item) * 3,
    'booster': 3 + tier(item) * 3,
    'primary': 3 + tier(item) * 3,
    'secondary': 3 + tier(item) * 3,
    'throwable': 3 + tier(item) * 3,
    'Defense': 3 + tier(item) * 3,
    'Orbital': 3 + tier(item) * 3,
    'Supply': 3 + tier(item) * 3,
    'Eagle': 3 + tier(item) * 3,
  }[item.category];
}

function stars(mission) {
  return {
    1: 0.2,
    2: 0.4,
    3: 0.6,
    4: 0.8,
    5: 1.0,
  }[mission.stars];
}
