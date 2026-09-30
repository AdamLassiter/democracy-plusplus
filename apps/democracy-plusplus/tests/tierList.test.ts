import assert from "node:assert/strict";
import test from "node:test";
import type { Item, Warbond } from "../src/types.ts";
import { applyTierOverrides, buildTierDraft, getSortedWarbondItems } from "../src/utils/tierList.ts";

const warbond: Warbond = {
  displayName: "Test Warbond",
  type: "Warbond",
  warbondCode: "test-warbond",
  tier: "b",
};

test("warbonds participate in armory tier drafts and overrides", () => {
  assert.deepEqual(buildTierDraft([warbond], {}), { "Test Warbond": "b" });
  assert.equal(applyTierOverrides([warbond], { "Test Warbond": "s" })[0]?.tier, "s");
});

test("warbond contents are filtered and sorted by tier without tier grouping", () => {
  const items: Item[] = [
    { displayName: "Delta", type: "Equipment", category: "primary", warbondCode: "test-warbond", tier: "d" },
    { displayName: "Beta", type: "Equipment", category: "secondary", warbondCode: "test-warbond", tier: "b" },
    { displayName: "Alpha", type: "Stratagem", category: "Supply", warbondCode: "test-warbond", tier: "s" },
    { displayName: "Other", type: "Equipment", category: "primary", warbondCode: "other", tier: "s" },
    { displayName: "Bravo", type: "Equipment", category: "booster", warbondCode: "test-warbond", tier: "b" },
  ];

  assert.deepEqual(
    getSortedWarbondItems(items, "test-warbond").map((item) => item.displayName),
    ["Alpha", "Beta", "Bravo", "Delta"],
  );
});
