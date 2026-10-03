export const FLAT_WIKI_DATASETS = [
  { fileName: "primaries", name: "PRIMARIES", enrichProperties: true, enrichDescription: false },
  { fileName: "secondaries", name: "SECONDARIES", enrichProperties: true, enrichDescription: false },
  { fileName: "throwables", name: "THROWABLES", enrichProperties: true, enrichDescription: false },
  { fileName: "stratagems", name: "STRATAGEMS", enrichProperties: true, enrichDescription: false },
  { fileName: "boosters", name: "BOOSTERS", enrichProperties: false, enrichDescription: "booster" },
  { fileName: "armor_passives", name: "ARMOR_PASSIVES", enrichProperties: false, enrichDescription: "armor-passive" },
  { fileName: "warbonds", name: "WARBONDS", enrichProperties: false, enrichDescription: false },
] as const;

export type FlatWikiDataset = (typeof FLAT_WIKI_DATASETS)[number];
export type FlatWikiDatasetName = FlatWikiDataset["fileName"];

export const WIKI_DATASET_NAMES = [
  ...FLAT_WIKI_DATASETS.map(({ fileName }) => fileName),
  "objectives",
  "enemies",
  "structures",
] as const;

export const IMAGE_DATASET_NAMES = [
  ...FLAT_WIKI_DATASETS.map(({ fileName }) => fileName),
  "enemies",
  "structures",
] as const;

export type WikiDatasetName = (typeof WIKI_DATASET_NAMES)[number];
export type ImageDatasetName = (typeof IMAGE_DATASET_NAMES)[number];

export function assertDatasetCoverage(
  stage: string,
  handledDatasets: readonly string[],
  expectedDatasets: readonly string[],
) {
  const duplicates = handledDatasets.filter((name, index) => handledDatasets.indexOf(name) !== index);
  const missing = expectedDatasets.filter((name) => !handledDatasets.includes(name));
  const unexpected = handledDatasets.filter((name) => !expectedDatasets.includes(name));

  if (duplicates.length || missing.length || unexpected.length) {
    throw new Error([
      `${stage} dataset coverage is invalid.`,
      duplicates.length ? `Duplicates: ${[...new Set(duplicates)].join(", ")}.` : "",
      missing.length ? `Missing: ${missing.join(", ")}.` : "",
      unexpected.length ? `Unexpected: ${unexpected.join(", ")}.` : "",
    ].filter(Boolean).join(" "));
  }
}

export function assertNonEmptyDatasets(stage: string, datasets: ReadonlyArray<readonly [string, number]>) {
  const emptyDatasets = datasets.filter(([, count]) => count === 0).map(([name]) => name);
  if (emptyDatasets.length) {
    throw new Error(`${stage} produced no records for required dataset(s): ${emptyDatasets.join(", ")}.`);
  }
}
