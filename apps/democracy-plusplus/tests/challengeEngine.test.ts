import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedWarbondItems,
  emptyEquipment,
  equipmentItems,
  ownedItems,
  prepareItemKnockoutPool,
  prepareWarbondKnockoutPool,
  randomLoadout,
  removeUsedItems,
} from "../src/challenges/engine.ts";
import type { Item } from "../src/types.ts";

const items: Item[] = [
  {
    displayName: "Basic Primary",
    type: "Equipment",
    category: "primary",
    warbondCode: "none",
    tier: "d",
  },
  {
    displayName: "Owned Primary",
    type: "Equipment",
    category: "primary",
    warbondCode: "owned",
    tier: "a",
  },
  {
    displayName: "Other Primary",
    type: "Equipment",
    category: "primary",
    warbondCode: "other",
    tier: "b",
  },
  {
    displayName: "Owned Secondary",
    type: "Equipment",
    category: "secondary",
    warbondCode: "owned",
    tier: "a",
  },
  {
    displayName: "Owned Armor",
    type: "Equipment",
    category: "armor",
    warbondCode: "owned",
    tier: "a",
  },
  ...Array.from({ length: 6 }, (_unused, index): Item => ({
    displayName: `Stratagem ${index}`,
    type: "Stratagem",
    category: "Orbital",
    warbondCode: index === 5 ? "other" : "owned",
    tier: "b",
  })),
];

test("owned item pools always include Basic Training but exclude unowned content", () => {
  assert.deepEqual(
    ownedItems(items, ["owned"]).map((item) => item.displayName),
    [
      "Basic Primary",
      "Owned Primary",
      "Owned Secondary",
      "Owned Armor",
      "Stratagem 0",
      "Stratagem 1",
      "Stratagem 2",
      "Stratagem 3",
      "Stratagem 4",
    ],
  );
});

test("random loadouts are deterministic, unique, and tolerate missing categories", () => {
  const eligible = ownedItems(items, ["owned"]);
  const first = randomLoadout(eligible, 42);
  const second = randomLoadout(eligible, 42);

  assert.deepEqual(first, second);
  assert.ok(first.primary);
  assert.ok(first.secondary);
  assert.ok(first.armorPassive);
  assert.equal(first.throwable, null);
  assert.equal(first.booster, null);
  assert.equal(new Set(first.stratagems.filter(Boolean)).size, 4);
});

test("all-item knockout removes only equipment committed for the mission", () => {
  const loadout = emptyEquipment();
  loadout.primary = "Owned Primary";
  loadout.stratagems[0] = "Stratagem 2";

  const remaining = removeUsedItems(
    items.map((item) => item.displayName),
    loadout,
  );

  assert.ok(!remaining.includes("Owned Primary"));
  assert.ok(!remaining.includes("Stratagem 2"));
  assert.ok(remaining.includes("Owned Secondary"));
  assert.deepEqual(equipmentItems(loadout), ["Owned Primary", "Stratagem 2"]);
});

test("warbond knockout permits the active warbond plus Basic Training only", () => {
  assert.deepEqual(
    allowedWarbondItems(items, "owned").map((item) => item.displayName),
    [
      "Basic Primary",
      "Owned Primary",
      "Owned Secondary",
      "Owned Armor",
      "Stratagem 0",
      "Stratagem 1",
      "Stratagem 2",
      "Stratagem 3",
      "Stratagem 4",
    ],
  );
  assert.deepEqual(allowedWarbondItems(items, null), []);
});

test("all-item pools reset only after the complete pool is empty", () => {
  assert.deepEqual(
    prepareItemKnockoutPool(["Still available"], ["New A", "New B"]),
    {
      reset: false,
      cycleItemIds: null,
      remainingItemIds: ["Still available"],
    },
  );
  assert.deepEqual(prepareItemKnockoutPool([], ["New A", "New B"]), {
    reset: true,
    cycleItemIds: ["New A", "New B"],
    remainingItemIds: ["New A", "New B"],
  });
});

test("warbond pools exclude Basic Training and preserve a cycle until exhausted", () => {
  assert.deepEqual(
    prepareWarbondKnockoutPool(["owned"], ["none", "owned", "other"], 7),
    {
      reset: false,
      cycleWarbondCodes: null,
      remainingWarbondCodes: ["owned"],
    },
  );
  const reset = prepareWarbondKnockoutPool([], ["none", "owned", "other"], 7);
  assert.equal(reset.reset, true);
  assert.deepEqual(
    new Set(reset.remainingWarbondCodes),
    new Set(["owned", "other"]),
  );
  assert.deepEqual(reset.cycleWarbondCodes, reset.remainingWarbondCodes);
});
