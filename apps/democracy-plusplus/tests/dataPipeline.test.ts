import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  assertDatasetCoverage,
  assertNonEmptyDatasets,
  FLAT_WIKI_DATASETS,
  IMAGE_DATASET_NAMES,
  WIKI_DATASET_NAMES,
} from "../scripts/dataPipeline.ts";

const expectedFlatDatasets = [
  "primaries",
  "secondaries",
  "throwables",
  "stratagems",
  "boosters",
  "armor_passives",
  "warbonds",
];

test("the unified data pipeline covers every wiki-backed dataset", () => {
  assert.deepEqual(FLAT_WIKI_DATASETS.map(({ fileName }) => fileName), expectedFlatDatasets);
  assert.deepEqual(WIKI_DATASET_NAMES, [
    ...expectedFlatDatasets,
    "objectives",
    "enemies",
    "structures",
  ]);
  assert.deepEqual(IMAGE_DATASET_NAMES, [
    ...expectedFlatDatasets,
    "enemies",
    "structures",
  ]);

  assert.doesNotThrow(() => assertDatasetCoverage("fetchData", WIKI_DATASET_NAMES, WIKI_DATASET_NAMES));
  assert.doesNotThrow(() => assertDatasetCoverage("enrichData", WIKI_DATASET_NAMES, WIKI_DATASET_NAMES));
  assert.doesNotThrow(() => assertDatasetCoverage("downloadImages", IMAGE_DATASET_NAMES, IMAGE_DATASET_NAMES));
});

test("pipeline coverage assertions reject missing, duplicate, and unexpected datasets", () => {
  assert.throws(
    () => assertDatasetCoverage("test", ["primaries", "primaries", "surprise"], ["primaries", "enemies"]),
    /Duplicates: primaries.*Missing: enemies.*Unexpected: surprise/,
  );
  assert.throws(
    () => assertNonEmptyDatasets("fetchData", [["weapons", 10], ["boosters", 0]]),
    /fetchData produced no records.*boosters/,
  );
});

test("legacy one-off fetch scripts and commands are removed", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts.fetchBestiary, undefined);
  assert.equal(packageJson.scripts.fetchStructures, undefined);
  assert.equal(packageJson.scripts.fetchWarbondImages, undefined);
  assert.equal(packageJson.scripts.enrichOffline, undefined);
  assert.equal(existsSync(new URL("../scripts/bestiaryFetcher.ts", import.meta.url)), false);
  assert.equal(existsSync(new URL("../scripts/structuresFetcher.ts", import.meta.url)), false);
});
