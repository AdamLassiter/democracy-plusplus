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

function itemWithDemolitionForce(demolitionForce: number): Item {
  return {
    displayName: `Demo Force ${demolitionForce}`,
    tier: "a",
    properties: { Main: { Damage: { "Demolition Force": String(demolitionForce) } } },
  };
}

test("grouped anti-tank filtering matches every detailed source-data level", () => {
  const items = [
    itemWithPenetration("Heavy"),
    ...["I", "II", "III", "IV", "V", "VI"].map((level) => itemWithPenetration(`Anti-Tank ${level}`)),
  ];

  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Anti-Tank"]).map((item) => item.displayName),
    items.slice(1).map((item) => item.displayName),
  );
});

test("detailed anti-tank filters each match only their corresponding level", () => {
  const items = ["I", "II", "III", "IV", "V", "VI"].map((level) =>
    itemWithPenetration(`Anti-Tank ${level}`),
  );

  DETAILED_ANTI_TANK_FILTERS.forEach((filterName, index) => {
    assert.deepEqual(
      filterItemsByPropertyValues(items, [filterName]).map((item) => item.displayName),
      [items[index].displayName],
    );
  });
});

test("detailed mode replaces the grouped filter with six numeric filters", () => {
  assert.ok(getPropertyFilters(false).includes("Anti-Tank"));
  assert.ok(!getPropertyFilters(true).includes("Anti-Tank"));
  assert.deepEqual(
    getPropertyFilters(true).filter((filterName) => filterName.startsWith("Anti-Tank")),
    [...DETAILED_ANTI_TANK_FILTERS],
  );
});

test("switching detail modes preserves the meaning of an active anti-tank filter", () => {
  assert.deepEqual(normalizeAntiTankFilters(["Fire", "Anti-Tank"], true), [
    "Fire",
    ...DETAILED_ANTI_TANK_FILTERS,
  ]);
  assert.deepEqual(normalizeAntiTankFilters(["Anti-Tank 2", "Anti-Tank 5", "Gas"], false), [
    "Gas",
    "Anti-Tank",
  ]);
});

test("grouped demolition force matches 40 or higher", () => {
  const items = [10, 20, 30, 40, 50, 60].map(itemWithDemolitionForce);

  assert.deepEqual(
    filterItemsByPropertyValues(items, ["Demo Force 40+"]).map((item) => item.displayName),
    ["Demo Force 40", "Demo Force 50", "Demo Force 60"],
  );
});

test("detailed demolition force filters match exact increments", () => {
  const items = [10, 20, 30, 40, 50, 60].map(itemWithDemolitionForce);

  DETAILED_DEMOLITION_FORCE_FILTERS.forEach((filterName, index) => {
    assert.deepEqual(
      filterItemsByPropertyValues(items, [filterName]).map((item) => item.displayName),
      [items[index].displayName],
    );
  });
  assert.ok(getPropertyFilters(false, false).includes("Demo Force 40+"));
  assert.deepEqual(
    getPropertyFilters(false, true).filter((filterName) => filterName.startsWith("Demo Force")),
    [...DETAILED_DEMOLITION_FORCE_FILTERS],
  );
});

test("switching demolition detail modes preserves only grouped-equivalent selections", () => {
  assert.deepEqual(normalizePropertyFilters(["Fire", "Demo Force 40+"], false, true), [
    "Fire",
    "Demo Force 40",
    "Demo Force 50",
    "Demo Force 60",
  ]);
  assert.deepEqual(
    normalizePropertyFilters(["Demo Force 20", "Demo Force 50", "Gas"], false, false),
    ["Gas", "Demo Force 40+"],
  );
  assert.deepEqual(
    normalizePropertyFilters(["Demo Force 10", "Demo Force 30", "Arc"], false, false),
    ["Arc"],
  );
});

test("demolition filters inspect only demolition-force fields", () => {
  const unrelatedForty: Item = {
    displayName: "Unrelated 40",
    tier: "b",
    properties: { Weapon: { Base: { Damage: "40 Ballistic", Cooldown: "60 s" } } },
  };

  assert.equal(filterItemsByPropertyValues([unrelatedForty], ["Demo Force 40+"]).length, 0);
  assert.equal(filterItemsByPropertyValues([unrelatedForty], ["Demo Force 60"]).length, 0);
});

test("unarmored includes very-light penetration without leaking into light", () => {
  const veryLight = itemWithPenetration("Very Light");
  assert.equal(filterItemsByPropertyValues([veryLight], ["Unarmored"]).length, 1);
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

  assert.equal(filterItemsByPropertyValues([noisyLightWeapon], ["Medium"]).length, 0);
  assert.equal(filterItemsByPropertyValues([noisyLightWeapon], ["Heavy"]).length, 0);
  assert.equal(filterItemsByPropertyValues([noisyLightWeapon], ["Light"]).length, 1);
  assert.equal(filterItemsByPropertyValues([noisyLightWeapon], ["Unarmored"]).length, 1);
});

test("laser damage is available as a property filter", () => {
  const laser = itemWithPenetration("Light");
  laser.properties = {
    Damage: { Standard: "350 Laser" },
  };

  assert.equal(filterItemsByPropertyValues([laser], ["Laser"]).length, 1);
});
