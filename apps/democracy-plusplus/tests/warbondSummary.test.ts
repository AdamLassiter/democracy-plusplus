import assert from "node:assert/strict";
import test from "node:test";

import type { Item, Warbond } from "../src/types.ts";
import {
  filterWarbondsBySummary,
  getWarbondSummary,
  warbondSummaryMatchesFilters,
} from "../src/utils/warbondSummary.ts";

const WARBOND_CODE = "test-warbond";

function item(
  overrides: Partial<Item> & Pick<Item, "displayName" | "tier">,
): Item {
  return {
    category: "primary",
    type: "Equipment",
    warbondCode: WARBOND_CODE,
    ...overrides,
  };
}

function attack(penetration: string, damage: string, demolitionForce?: number) {
  return {
    Main: {
      Penetration: { Direct: penetration },
      Damage: {
        Standard: damage,
        ...(demolitionForce === undefined
          ? {}
          : { "Demolition Force": String(demolitionForce) }),
      },
    },
  };
}

test("warbond summaries expose best class tiers, penetration values, and damage types", () => {
  const summary = getWarbondSummary(
    [
      item({
        displayName: "Primary A",
        tier: "a",
        properties: attack("Medium", "100 Ballistic"),
      }),
      item({
        displayName: "Primary S",
        tier: "s",
        properties: attack("Heavy", "200 Laser"),
      }),
      item({
        displayName: "Secondary",
        tier: "b",
        category: "secondary",
        properties: attack("Light", "50 Fire"),
      }),
      item({
        displayName: "Grenade",
        tier: "c",
        category: "throwable",
        properties: attack("Anti-Tank II", "400 Explosion", 50),
      }),
      item({ displayName: "Armor", tier: "a", category: "armor" }),
      item({ displayName: "Booster", tier: "d", category: "booster" }),
      item({
        displayName: "Stratagem",
        tier: "b",
        category: "Supply",
        type: "Stratagem",
        properties: attack("Heavy", "20 Gas"),
      }),
    ],
    WARBOND_CODE,
  );

  assert.equal(summary.itemCount, 7);
  assert.deepEqual(summary.bestTiers, {
    primary: "s",
    secondary: "b",
    throwable: "c",
    armor: "a",
    stratagem: "b",
    booster: "d",
  });
  assert.deepEqual(summary.armorPenetrationValues, [2, 3, 4, 6]);
  assert.deepEqual(summary.armorPenetrationLabels, [
    "Light",
    "Medium",
    "Heavy",
    "Anti-Tank 2",
  ]);
  assert.deepEqual(summary.demolitionForceValues, [50]);
  assert.equal(summary.destroysSpawners, true);
  assert.deepEqual(summary.damageTypes, [
    "Ballistic",
    "Explosive",
    "Fire",
    "Gas",
    "Laser",
  ]);
});

test("warbond filters combine tier groups with aggregate capability filters", () => {
  const summary = getWarbondSummary(
    [
      item({
        displayName: "Primary",
        tier: "s",
        properties: attack("Anti-Tank III", "100 Ballistic"),
      }),
      item({
        displayName: "Secondary",
        tier: "b",
        category: "secondary",
        properties: attack("Medium", "50 Arc"),
      }),
    ],
    WARBOND_CODE,
  );

  assert.equal(
    warbondSummaryMatchesFilters(summary, ["Anti-Tank", "Fire"], {
      primary: ["s", "a"],
      secondary: ["b"],
    }),
    true,
    "capabilities use OR while selected class groups all have to match",
  );
  assert.equal(
    warbondSummaryMatchesFilters(
      summary,
      ["Anti-Tank", "Fire"],
      {
        primary: ["s", "a"],
        secondary: ["b"],
      },
      "and",
    ),
    false,
    "AND requires every selected capability",
  );
  assert.equal(
    warbondSummaryMatchesFilters(summary, ["Fire"], { primary: ["s"] }),
    false,
  );
  assert.equal(
    warbondSummaryMatchesFilters(summary, [], {
      primary: ["a"],
      secondary: ["b"],
    }),
    false,
  );
});

test("warbond filters include aggregate demolition force", () => {
  const summary = getWarbondSummary(
    [
      item({
        displayName: "Low demo",
        tier: "a",
        properties: attack("Medium", "100 Ballistic", 20),
      }),
      item({
        displayName: "High demo",
        tier: "b",
        properties: attack("Heavy", "200 Explosion", 50),
      }),
    ],
    WARBOND_CODE,
  );

  assert.equal(
    warbondSummaryMatchesFilters(summary, ["Destroys Spawners"], {}),
    true,
  );
  assert.equal(
    warbondSummaryMatchesFilters(summary, ["Demo Force 50"], {}),
    true,
  );
  assert.equal(
    warbondSummaryMatchesFilters(summary, ["Demo Force 60"], {}),
    false,
  );
});

test("warbond summaries apply the explosive exception to the same attack", () => {
  const explosiveTwenty = getWarbondSummary(
    [
      item({
        displayName: "Explosive 20",
        tier: "a",
        properties: attack("Medium", "100 Explosion", 20),
      }),
    ],
    WARBOND_CODE,
  );
  const ballisticTwenty = getWarbondSummary(
    [
      item({
        displayName: "Ballistic 20",
        tier: "a",
        properties: attack("Medium", "100 Ballistic", 20),
      }),
    ],
    WARBOND_CODE,
  );

  assert.equal(explosiveTwenty.destroysSpawners, true);
  assert.equal(ballisticTwenty.destroysSpawners, false);
});

test("warbond filtering uses only items assigned to each warbond", () => {
  const warbonds: Warbond[] = [
    { displayName: "Alpha", type: "Warbond", warbondCode: "alpha", tier: "a" },
    { displayName: "Beta", type: "Warbond", warbondCode: "beta", tier: "b" },
  ];
  const items: Item[] = [
    {
      ...item({ displayName: "Alpha primary", tier: "s" }),
      warbondCode: "alpha",
    },
    {
      ...item({ displayName: "Beta primary", tier: "b" }),
      warbondCode: "beta",
    },
  ];

  assert.deepEqual(
    filterWarbondsBySummary(warbonds, items, [], { primary: ["s"] }).map(
      ({ displayName }) => displayName,
    ),
    ["Alpha"],
  );
});
