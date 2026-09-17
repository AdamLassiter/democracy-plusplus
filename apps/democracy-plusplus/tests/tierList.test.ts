import assert from "node:assert/strict";
import test from "node:test";
import type { Warbond } from "../src/types.ts";
import { applyTierOverrides, buildTierDraft } from "../src/utils/tierList.ts";

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
