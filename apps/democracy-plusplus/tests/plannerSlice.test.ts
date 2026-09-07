import assert from "node:assert/strict";
import test from "node:test";
import plannerReducer from "../src/slices/plannerSlice.ts";

test("planner defaults Bestiary to none, partial resisted, and partial coverage", () => {
  const state = plannerReducer(undefined, { type: "@@init" });

  assert.deepEqual(state.enemyCoverageFilters, ["none", "partialResisted", "partial"]);
  assert.deepEqual(state.structureCoverageFilters, ["none"]);
});
