import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSupplyCrates,
  calculateSupplyCrateExpectedValue,
  chooseSupplyCrateContents,
  findSupplyCrate,
  getSupplyCrateTierOdds,
} from "../src/economics/supplyCrates.ts";
import { itemCost } from "../src/economics/pricing.ts";
import type {
  EquipmentCategory,
  Item,
  StratagemCategory,
  Tier,
} from "../src/types.ts";

const categories: Array<EquipmentCategory | StratagemCategory> = [
  "primary",
  "secondary",
  "throwable",
  "armor",
  "booster",
  "Orbital",
  "Eagle",
  "Defense",
  "Supply",
];
const tiers: Tier[] = ["s", "a", "b", "c", "d"];

const items: Item[] = categories.flatMap((category) =>
  tiers.map((tier) => ({
    displayName: `${category}-${tier}`,
    category,
    type: /^[A-Z]/.test(category) ? "Stratagem" : "Equipment",
    tier,
  })),
);

function readItems(fileName: string): Item[] {
  return JSON.parse(
    readFileSync(
      new URL(`../public/data/${fileName}`, import.meta.url),
      "utf8",
    ),
  ) as Item[];
}

test("builds tiered crates for every equipment and stratagem category", () => {
  const crates = buildSupplyCrates(items);

  assert.equal(crates.length, categories.length * 3);
  assert.equal(new Set(crates.map((crate) => crate.displayName)).size, 27);
  assert.equal(new Set(crates.map((crate) => crate.internalName)).size, 27);

  for (const category of categories) {
    const label =
      category.charAt(0).toUpperCase() + category.substring(1).toLowerCase();
    const categoryCrates = crates.filter((crate) =>
      crate.displayName.endsWith(`${label} Crate`),
    );

    assert.deepEqual(
      categoryCrates.map((crate) => crate.tier),
      ["a", "b", "c"],
    );
    assert.ok(categoryCrates.every((crate) => crate.contents.length > 0));
    assert.ok(
      categoryCrates.every((crate) =>
        crate.contents.every((item) => item.category === category),
      ),
    );
  }
});

test("every crate generated from the production catalog can be opened", () => {
  const catalog = [
    "armor_passives.json",
    "boosters.json",
    "primaries.json",
    "secondaries.json",
    "throwables.json",
    "stratagems.json",
  ].flatMap(readItems);
  const crates = buildSupplyCrates(catalog);

  assert.equal(crates.length, 27);
  assert.deepEqual(
    crates.filter((crate) => crate.contents.length === 0),
    [],
  );
  for (const crate of crates) {
    const expectedValue = calculateSupplyCrateExpectedValue(crate, itemCost);
    assert.equal(
      crate.cost,
      Math.round(expectedValue * 0.8),
      `${crate.displayName} should cost 80% of its ${expectedValue.toFixed(2)} expected value`,
    );
  }
});

test("crate grades set the minimum item tier and calibrated cost", () => {
  const crates = buildSupplyCrates(items);
  const primaryA = crates.find(
    (crate) => crate.displayName === "A-Tier Primary Crate",
  );
  const primaryC = crates.find(
    (crate) => crate.displayName === "C-Tier Primary Crate",
  );
  const orbitalB = crates.find(
    (crate) => crate.displayName === "B-Tier Orbital Crate",
  );

  assert.deepEqual(
    primaryA?.contents.map((item) => item.tier),
    ["s", "a"],
  );
  assert.deepEqual(
    primaryC?.contents.map((item) => item.tier),
    ["s", "a", "b", "c"],
  );
  assert.equal(primaryA?.cost, 21);
  assert.equal(orbitalB?.cost, 18);
});

test("rolls item tier with decreasing odds for each upgrade tier", () => {
  const crate = findSupplyCrate(items, "C-Tier Primary Crate");
  assert.ok(crate);

  const odds = getSupplyCrateTierOdds(crate);
  assert.deepEqual(
    odds.map(({ tier, probability }) => [tier, probability]),
    [
      ["c", 0.6],
      ["b", 0.25],
      ["a", 0.1],
      ["s", 0.05],
    ],
  );
});

test("legacy generic stratagem crates remain resolvable for saved purchases", () => {
  const crate = findSupplyCrate(items, "B-Tier Stratagem Crate");

  assert.ok(crate);
  assert.deepEqual(
    new Set(crate.contents.map((item) => item.category)),
    new Set(["Orbital", "Eagle", "Defense", "Supply"]),
  );
  assert.ok(crate.contents.every((item) => item.type === "Stratagem"));
  assert.ok(
    crate.contents.every((item) => item.tier !== "c" && item.tier !== "d"),
  );
});

test("rolls the tier before choosing an item within that tier", () => {
  const crate = findSupplyCrate(items, "C-Tier Secondary Crate");
  assert.ok(crate);
  const baseTierItem = crate.contents.find((item) => item.tier === "c");
  assert.ok(baseTierItem);
  const secondBaseTierItem = {
    ...baseTierItem,
    displayName: "secondary-c-2",
  };
  crate.contents.push(secondBaseTierItem);
  const before = [...crate.contents];
  const rolls = [0, 0.999];

  assert.equal(
    chooseSupplyCrateContents(crate, () => rolls.shift() ?? 0),
    secondBaseTierItem,
  );
  assert.equal(
    chooseSupplyCrateContents(crate, () => 0.999),
    crate.contents.find((item) => item.tier === "s"),
  );
  assert.deepEqual(crate.contents, before);
});

test("rejects an empty crate instead of losing a purchased crate", () => {
  assert.throws(
    () =>
      chooseSupplyCrateContents({
        displayName: "Empty Crate",
        type: "Care Package",
        category: "crate",
        contents: [],
        cost: 1,
        tier: "c",
      }),
    /Supply crate has no contents: Empty Crate/,
  );
});
