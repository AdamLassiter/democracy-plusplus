import assert from "node:assert/strict";
import test from "node:test";

import preferencesReducer, {
  resetPreferences,
  setItemDisplaySize,
  setPreferencesState,
} from "../src/slices/preferencesSlice.ts";

test("item displays default to large and persist a small-card preference", () => {
  const initial = preferencesReducer(undefined, { type: "init" });
  assert.equal(initial.itemDisplaySize, "large");

  const small = preferencesReducer(initial, setItemDisplaySize("small"));
  assert.equal(small.itemDisplaySize, "small");
  assert.equal(preferencesReducer(small, resetPreferences()).itemDisplaySize, "large");
});

test("imported legacy preferences receive the current item display default", () => {
  const imported = preferencesReducer(undefined, setPreferencesState({ titles: false }));
  assert.equal(imported.titles, false);
  assert.equal(imported.itemDisplaySize, "large");
});
