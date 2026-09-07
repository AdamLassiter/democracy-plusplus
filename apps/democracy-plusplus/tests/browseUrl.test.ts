import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { readQuery, retainQueryKeys, updateQuery } from "../src/utils/browseUrl.ts";

test("application URLs retain only the selected top-level tab", () => {
  const dom = new JSDOM("", { url: "https://example.test/?tab=bestiary&difficulty=7&q=charger" });
  Object.assign(globalThis, {
    window: dom.window,
    PopStateEvent: dom.window.PopStateEvent,
  });

  retainQueryKeys(["tab"]);

  assert.equal(window.location.pathname, "/");
  assert.equal(readQuery().get("tab"), "bestiary");
  assert.equal(readQuery().get("difficulty"), null);
  assert.equal(readQuery().get("q"), null);
  updateQuery({ tab: "structures" });
  assert.equal(readQuery().toString(), "tab=structures");
});
