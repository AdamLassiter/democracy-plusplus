import assert from "node:assert/strict";
import test from "node:test";

import {
  DETAILED_ANTI_TANK_FILTERS,
  filterItemsByPropertyValues,
  getPropertyFilters,
  normalizeAntiTankFilters,
} from "../src/constants/filters.ts";
import type { Item } from "../src/types.ts";

function itemWithPenetration(penetration: string): Item {
  return {
    displayName: penetration,
    tier: "a",
    properties: { Damage: { Penetration: { Direct: penetration } } },
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

test("unarmored includes very-light penetration without leaking into light", () => {
  const veryLight = itemWithPenetration("Very Light");
  assert.equal(filterItemsByPropertyValues([veryLight], ["Unarmored"]).length, 1);
  assert.equal(filterItemsByPropertyValues([veryLight], ["Light"]).length, 0);
});
