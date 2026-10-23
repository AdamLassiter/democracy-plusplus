import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSupplyCrates,
  calculateSupplyCrateExpectedValue,
  chooseSupplyCrateContents,
  findSupplyCrate,
  getSupplyCrateTierOdds,
  normaliseSupplyCrateStock,
  returnSupplyCrateToStock,
  takeSupplyCrateFromStock,
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

test("builds equipment, combined stratagem, and separate supply crates", () => {
  const crates = buildSupplyCrates(items);

  assert.equal(crates.length, 21);
  assert.equal(new Set(crates.map((crate) => crate.displayName)).size, 21);
  assert.equal(new Set(crates.map((crate) => crate.internalName)).size, 21);

  for (const category of categories.filter(
    (value): value is EquipmentCategory => /^[a-z]/.test(value),
  )) {
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

  const stratagemCrates = crates.filter((crate) =>
    crate.displayName.endsWith("Stratagem Crate"),
  );
  assert.deepEqual(
    stratagemCrates.map((crate) => crate.tier),
    ["a", "b", "c"],
  );
  assert.ok(stratagemCrates.every((crate) => crate.stock === Infinity));
  assert.deepEqual(
    new Set(
      stratagemCrates.flatMap((crate) =>
        crate.contents.map((item) => item.category),
      ),
    ),
    new Set(["Orbital", "Eagle", "Defense"]),
  );

  const supplyCrates = crates.filter((crate) =>
    crate.displayName.endsWith("Supply Crate"),
  );
  assert.ok(supplyCrates.every((crate) => crate.stock === Infinity));
  assert.ok(
    supplyCrates.every((crate) =>
      crate.contents.every((item) => item.category === "Supply"),
    ),
  );
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

  assert.equal(crates.length, 21);
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
    (crate) => crate.displayName === "B-Tier Stratagem Crate",
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
  assert.equal(orbitalB?.cost, 19);
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

test("legacy category-specific stratagem crates remain resolvable", () => {
  const crate = findSupplyCrate(items, "B-Tier Orbital Crate");

  assert.ok(crate);
  assert.ok(crate.contents.every((item) => item.category === "Orbital"));
  assert.ok(
    crate.contents.every((item) => item.tier !== "c" && item.tier !== "d"),
  );
});

test("all supply crates have infinite stock", () => {
  const crates = buildSupplyCrates(items);
  const stratagemName = "B-Tier Stratagem Crate";
  const supplyName = "B-Tier Supply Crate";

  for (let index = 0; index < 10; index += 1) {
    assert.equal(takeSupplyCrateFromStock(crates, stratagemName), true);
    assert.equal(takeSupplyCrateFromStock(crates, supplyName), true);
  }
  assert.equal(
    crates.find((crate) => crate.displayName === stratagemName)?.stock,
    Infinity,
  );
  assert.equal(
    crates.find((crate) => crate.displayName === supplyName)?.stock,
    Infinity,
  );
  assert.equal(returnSupplyCrateToStock(crates, stratagemName), true);
  assert.equal(returnSupplyCrateToStock(crates, supplyName), true);
});

test("saved finite crate stock is migrated to infinite stock", () => {
  const currentCrates = buildSupplyCrates(items);
  const savedStratagem = {
    ...findSupplyCrate(items, "B-Tier Stratagem Crate")!,
    stock: 1,
  };
  const legacyPurchasedStratagem = {
    ...findSupplyCrate(items, "A-Tier Stratagem Crate")!,
    stock: undefined,
    purchased: true,
  };
  const legacyPurchasedSupply = {
    ...findSupplyCrate(items, "B-Tier Supply Crate")!,
    stock: undefined,
    purchased: true,
  };
  const crates = normaliseSupplyCrateStock(currentCrates, [
    savedStratagem,
    legacyPurchasedStratagem,
    legacyPurchasedSupply,
  ]);

  for (const crate of crates) {
    assert.equal(crate.stock, Infinity);
    assert.equal(crate.purchased, false);
  }
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
    chooseSupplyCrateContents(crate, undefined, () => rolls.shift() ?? 0),
    secondBaseTierItem,
  );
  assert.equal(
    chooseSupplyCrateContents(crate, undefined, () => 0.999),
    crate.contents.find((item) => item.tier === "s"),
  );
  assert.deepEqual(crate.contents, before);
});

test("crate openings only roll items from selected warbonds", () => {
  const crate = findSupplyCrate(items, "C-Tier Primary Crate");
  assert.ok(crate);
  const selected = {
    ...crate.contents.find((item) => item.tier === "c")!,
    displayName: "Selected C-tier item",
    warbondCode: "selected",
  };
  const unselected = {
    ...crate.contents.find((item) => item.tier === "s")!,
    displayName: "Unselected S-tier item",
    warbondCode: "unselected",
  };
  crate.contents = [selected, unselected];

  assert.equal(
    chooseSupplyCrateContents(crate, ["selected"], () => 0.999),
    selected,
  );
  assert.throws(
    () => chooseSupplyCrateContents(crate, ["missing"]),
    /Supply crate has no contents/,
  );
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
