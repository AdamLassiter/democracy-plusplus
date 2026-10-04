import assert from "node:assert/strict";
import test from "node:test";

import {
  DETAILED_ANTI_TANK_FILTERS,
  DETAILED_DEMOLITION_FORCE_FILTERS,
  filterItemsByPropertyValues,
  getPropertyFilters,
  normalizeAntiTankFilters,
  normalizePropertyFilters,
} from "../src/constants/filters.ts";
import type { Item } from "../src/types.ts";

function itemWithPenetration(penetration: string): Item {
  return {
    displayName: penetration,
    tier: "a",
    properties: { Damage: { Penetration: { Direct: penetration } } },
  };
}

function itemWithDemolitionForce(
  demolitionForce: number,
  explosive = false,
): Item {
  return {
    displayName: `Demo Force ${demolitionForce}${explosive ? " Explosive" : ""}`,
    tier: "a",
    properties: {
      Main: {
        Damage: {
          Standard: explosive ? "100 Explosion" : "100 Ballistic",
          "Demolition Force": String(demolitionForce),
        },
      },
    },
  };
}

test("grouped anti-tank filtering matches every detailed source-data level", () => {
  const items = [
    itemWithPenetration("Heavy"),
    ...["I", "II", "III", "IV", "V", "VI"].map((level) =>
      itemWithPenetration(`Anti-Tank ${level}`),
    ),
  ];

  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Anti-Tank"]).map(
      (item) => item.displayName,
    ),
    items.slice(1).map((item) => item.displayName),
  );
});

test("detailed anti-tank filters each match only their corresponding level", () => {
  const items = ["I", "II", "III", "IV", "V", "VI"].map((level) =>
    itemWithPenetration(`Anti-Tank ${level}`),
  );

  DETAILED_ANTI_TANK_FILTERS.forEach((filterName, index) => {
    assert.deepEqual(
      filterItemsByPropertyValues(items, [filterName]).map(
        (item) => item.displayName,
      ),
      [items[index].displayName],
    );
  });
});

test("detailed mode replaces the grouped filter with six numeric filters", () => {
  assert.ok(getPropertyFilters(false).includes("Anti-Tank"));
  assert.ok(!getPropertyFilters(true).includes("Anti-Tank"));
  assert.deepEqual(
    getPropertyFilters(true).filter((filterName) =>
      filterName.startsWith("Anti-Tank"),
    ),
    [...DETAILED_ANTI_TANK_FILTERS],
  );
});

test("switching detail modes preserves the meaning of an active anti-tank filter", () => {
  assert.deepEqual(normalizeAntiTankFilters(["Fire", "Anti-Tank"], true), [
    "Fire",
    ...DETAILED_ANTI_TANK_FILTERS,
  ]);
  assert.deepEqual(
    normalizeAntiTankFilters(["Anti-Tank 2", "Anti-Tank 5", "Gas"], false),
    ["Gas", "Anti-Tank"],
  );
});

test("destroys spawners requires demo force 40 or demo force 20 with explosive damage", () => {
  const items = [
    itemWithDemolitionForce(10, true),
    itemWithDemolitionForce(20),
    itemWithDemolitionForce(20, true),
    itemWithDemolitionForce(30),
    itemWithDemolitionForce(30, true),
    itemWithDemolitionForce(40),
    itemWithDemolitionForce(50),
    itemWithDemolitionForce(60),
  ];

  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Destroys Spawners"]).map(
      (item) => item.displayName,
    ),
    [
      "Demo Force 20 Explosive",
      "Demo Force 30 Explosive",
      "Demo Force 40",
      "Demo Force 50",
      "Demo Force 60",
    ],
  );
});

test("destroys spawners correlates explosive damage and demolition force per attack", () => {
  const splitCapabilities: Item = {
    displayName: "Split capabilities",
    tier: "a",
    properties: {
      HighDemo: {
        Damage: { Standard: "100 Ballistic", "Demolition Force": "20" },
      },
      Explosive: {
        Damage: { Standard: "100 Explosion", "Demolition Force": "10" },
      },
    },
  };

  assert.equal(
    filterItemsByPropertyValues([splitCapabilities], ["Destroys Spawners"])
      .length,
    0,
  );
});

test("detailed demolition force filters match exact increments", () => {
  const items = [10, 20, 30, 40, 50, 60].map(itemWithDemolitionForce);

  DETAILED_DEMOLITION_FORCE_FILTERS.forEach((filterName, index) => {
    assert.deepEqual(
      filterItemsByPropertyValues(items, [filterName]).map(
        (item) => item.displayName,
      ),
      [items[index].displayName],
    );
  });
  assert.ok(getPropertyFilters(false, false).includes("Destroys Spawners"));
  assert.deepEqual(
    getPropertyFilters(false, true).filter((filterName) =>
      filterName.startsWith("Demo Force"),
    ),
    [...DETAILED_DEMOLITION_FORCE_FILTERS],
  );
});

test("switching demolition detail modes preserves only unambiguous selections", () => {
  assert.deepEqual(
    normalizePropertyFilters(["Fire", "Destroys Spawners"], false, true),
    ["Fire"],
  );
  assert.deepEqual(
    normalizePropertyFilters(
      ["Demo Force 20", "Demo Force 50", "Gas"],
      false,
      false,
    ),
    ["Gas", "Destroys Spawners"],
  );
  assert.deepEqual(
    normalizePropertyFilters(
      ["Demo Force 10", "Demo Force 20", "Arc"],
      false,
      false,
    ),
    ["Arc"],
  );
});

test("demolition filters inspect only demolition-force fields", () => {
  const unrelatedForty: Item = {
    displayName: "Unrelated 40",
    tier: "b",
    properties: {
      Weapon: { Base: { Damage: "40 Ballistic", Cooldown: "60 s" } },
    },
  };

  assert.equal(
    filterItemsByPropertyValues([unrelatedForty], ["Destroys Spawners"]).length,
    0,
  );
  assert.equal(
    filterItemsByPropertyValues([unrelatedForty], ["Demo Force 60"]).length,
    0,
  );
});

test("property filters can combine selections with OR or AND", () => {
  const fireOnly: Item = {
    displayName: "Fire only",
    tier: "a",
    properties: { Main: { Damage: { Standard: "100 Fire" } } },
  };
  const gasOnly: Item = {
    displayName: "Gas only",
    tier: "a",
    properties: { Main: { Damage: { Standard: "100 Gas" } } },
  };
  const fireAndGas: Item = {
    displayName: "Fire and gas",
    tier: "a",
    properties: { Main: { Damage: { Standard: "100 Fire and Gas" } } },
  };
  const items = [fireOnly, gasOnly, fireAndGas];

  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Fire", "Gas"], "or").map(
      (item) => item.displayName,
    ),
    ["Fire only", "Gas only", "Fire and gas"],
  );
  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Fire", "Gas"], "and").map(
      (item) => item.displayName,
    ),
    ["Fire and gas"],
  );
  assert.deepEqual(filterItemsByPropertyValues(items, [], "and"), items);
});

test("unarmored includes very-light penetration without leaking into light", () => {
  const veryLight = itemWithPenetration("Very Light");
  assert.equal(
    filterItemsByPropertyValues([veryLight], ["Unarmored"]).length,
    1,
  );
  assert.equal(filterItemsByPropertyValues([veryLight], ["Light"]).length, 0);
});

test("armor filters inspect penetration angles instead of unrelated property values", () => {
  const noisyLightWeapon: Item = {
    displayName: "Noisy light weapon",
    tier: "b",
    properties: {
      Weapon: {
        Base: { "Noise When Firing": "Medium" },
        Penetration: {
          Direct: "Light",
          "Slight Angle": "Light",
          "Large Angle": "Very Light",
          "Extreme Angle": "Unarmored",
          "Inner AP": "Heavy",
        },
      },
    },
  };

  assert.equal(
    filterItemsByPropertyValues([noisyLightWeapon], ["Medium"]).length,
    0,
  );
  assert.equal(
    filterItemsByPropertyValues([noisyLightWeapon], ["Heavy"]).length,
    0,
  );
  assert.equal(
    filterItemsByPropertyValues([noisyLightWeapon], ["Light"]).length,
    1,
  );
  assert.equal(
    filterItemsByPropertyValues([noisyLightWeapon], ["Unarmored"]).length,
    1,
  );
});

test("laser damage is available as a property filter", () => {
  const laser = itemWithPenetration("Light");
  laser.properties = {
    Damage: { Standard: "350 Laser" },
  };

  assert.equal(filterItemsByPropertyValues([laser], ["Laser"]).length, 1);
});
