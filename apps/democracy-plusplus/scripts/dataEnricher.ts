import fs from "fs/promises";
import type { ItemProperties, ObjectiveTag } from "../src/types.ts";
import { assertDatasetCoverage, FLAT_WIKI_DATASETS, WIKI_DATASET_NAMES, type FlatWikiDataset } from "./dataPipeline.ts";
import {
  expandTemplate,
  extractInfoboxImageFile,
  fetchPageSources,
  findAttackTemplateInvocation,
  getImageFileName,
  parseBoosterPageDescription,
  parseExpandedAttackTables,
  resolveImageUrls,
  type WikiPageSource,
} from "./wikiApi.ts";
import { banner, createTask, detail, errorMessage, item, note, section, summary } from "./terminalUi.ts";

interface EnrichableItem {
  displayName: string;
  wikiSlug?: string;
  wikiImageUrl?: string | null;
  imageUrl?: string;
  description?: string;
  properties?: ItemProperties;
  hoverTexts?: unknown;
  [key: string]: unknown;
}

interface BestiaryData {
  enemies: Array<EnrichableItem & { variants?: EnrichableItem[] }>;
  [key: string]: unknown;
}

interface StructuresData {
  structures: EnrichableItem[];
  [key: string]: unknown;
}

function getObjectiveModeTag(displayName: string): ObjectiveTag | undefined {
  if (displayName.includes("Eradicate")) return "Eradicate";
  if (displayName.includes("Commando")) return "Commando";
  if (displayName.includes("Blitz")) return "Blitz";
  return undefined;
}

function mergeTags(existingTags: unknown, modeTag: ObjectiveTag | undefined) {
  const tags = Array.isArray(existingTags) ? existingTags.filter((tag): tag is string => typeof tag === "string") : [];
  const normalizedTags = tags.filter((tag) => !["Eradicate", "Commando", "Blitz"].includes(tag));
  if (modeTag) normalizedTags.push(modeTag);
  return normalizedTags.length ? [...new Set(normalizedTags)] : undefined;
}

function refreshLocalImagePath(record: EnrichableItem, folder: string) {
  const imageFileName = getImageFileName(record.wikiImageUrl);
  if (!imageFileName) return false;
  record.imageUrl = `${folder}/${imageFileName}`;
  return true;
}

async function resolveInfoboxImages(items: EnrichableItem[], pages: Map<string, WikiPageSource>) {
  const imageFiles = new Map<EnrichableItem, string>();
  for (const record of items) {
    if (!record.wikiSlug) continue;
    const page = pages.get(record.wikiSlug);
    if (!page) continue;
    const imageFile = extractInfoboxImageFile(page.content, page.title);
    if (imageFile) imageFiles.set(record, imageFile);
  }

  const imageUrls = await resolveImageUrls([...imageFiles.values()]);
  for (const [record, imageFile] of imageFiles) {
    record.wikiImageUrl = imageUrls.get(imageFile) ?? record.wikiImageUrl ?? null;
  }
}

async function enrichItemProperties(record: EnrichableItem, page: WikiPageSource) {
  const attackTemplate = findAttackTemplateInvocation(page.content);
  if (!attackTemplate) return "missing-template" as const;

  const expanded = await expandTemplate(attackTemplate, page.title);
  const properties = parseExpandedAttackTables(expanded);
  if (!Object.keys(properties).length) return "empty-properties" as const;

  record.properties = properties;
  delete record.hoverTexts;
  return "processed" as const;
}

async function processArray(dataset: FlatWikiDataset) {
  const {
    fileName,
    name,
    enrichProperties: shouldEnrichProperties,
    enrichDescription: shouldEnrichDescription,
  } = dataset;
  const filePath = `./public/data/${fileName}.json`;
  const loadTask = createTask(`Loading ${name}`, filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];
  loadTask.succeed(`${items.length} records`);

  const linkedItems = items.filter((record) => Boolean(record.wikiSlug));
  const fetchTask = createTask("Fetching sources", name);
  const pages = await fetchPageSources(linkedItems.map((record) => record.wikiSlug as string));
  fetchTask.succeed(`${pages.size} pages`);
  await resolveInfoboxImages(linkedItems, pages);

  section(`Processing ${name}`, `${items.length} items`);
  let processed = 0;
  let refreshedImages = 0;
  let unlinked = 0;
  let missingPages = 0;
  let missingTemplates = 0;
  let emptyProperties = 0;
  let descriptions = 0;
  let missingDescriptions = 0;
  let failures = 0;

  for (const record of items) {
    if (!record.wikiSlug) {
      unlinked++;
      item(record.displayName, "no wiki page; preserving curated data", "muted");
      continue;
    }

    const page = pages.get(record.wikiSlug);
    if (!page) {
      missingPages++;
      item(record.displayName || record.wikiSlug, "missing wiki source", "warn");
      continue;
    }

    if (fileName !== "warbonds") {
      record.displayName = page.title;
      record.wikiSlug = page.slug;
    }
    if (refreshLocalImagePath(record, fileName)) refreshedImages++;

    if (shouldEnrichDescription) {
      const description = parseBoosterPageDescription(page.content);
      if (description) {
        record.description = description;
        descriptions++;
      } else {
        missingDescriptions++;
        item(record.displayName, "no infobox description; preserving existing data", "warn");
      }
    }

    if (!shouldEnrichProperties) {
      processed++;
      continue;
    }

    try {
      const result = await enrichItemProperties(record, page);
      if (result === "missing-template") {
        missingTemplates++;
        item(record.displayName, "no attack template", "warn");
      } else if (result === "empty-properties") {
        emptyProperties++;
        item(record.displayName, "no structured properties", "warn");
      } else {
        processed++;
        item(record.displayName, `${Object.keys(record.properties ?? {}).length} property groups`, "success");
      }
    } catch (error) {
      failures++;
      item(record.displayName || record.wikiSlug, errorMessage(error), "error");
    }
  }

  const saveTask = createTask(`Saving ${name}`, filePath);
  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  saveTask.succeed("written");
  summary(`${name} summary`, {
    processed,
    refreshedImages,
    unlinked,
    missingPages,
    missingTemplates,
    emptyProperties,
    descriptions,
    missingDescriptions,
    failures,
  });
  return failures + missingPages + missingDescriptions;
}

async function processObjectives() {
  const filePath = "./public/data/objectives.json";
  const loadTask = createTask("Loading OBJECTIVES", filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];
  loadTask.succeed(`${items.length} records`);

  let tagged = 0;
  let cleared = 0;
  for (const record of items) {
    const tags = mergeTags(record.tags, getObjectiveModeTag(record.displayName));
    if (tags) {
      record.tags = tags;
      tagged++;
    } else {
      delete record.tags;
      cleared++;
    }
  }

  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  summary("OBJECTIVES summary", { tagged, cleared });
}

async function processBestiary() {
  const filePath = "./public/data/enemies.json";
  const raw = await fs.readFile(filePath, "utf-8");
  const bestiary = JSON.parse(raw) as BestiaryData;
  const records = bestiary.enemies.flatMap((enemy) => [enemy, ...(enemy.variants ?? [])]);
  const refreshedImages = records.filter((record) => refreshLocalImagePath(record, "enemies")).length;
  await fs.writeFile(filePath, JSON.stringify(bestiary, null, 2));
  summary("BESTIARY summary", {
    enemies: bestiary.enemies.length,
    variants: records.length - bestiary.enemies.length,
    refreshedImages,
  });
}

async function processStructures() {
  const filePath = "./public/data/structures.json";
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as StructuresData;
  const refreshedImages = data.structures.filter((record) => refreshLocalImagePath(record, "structures")).length;
  for (const structure of data.structures) structure.imageUrl ??= "icons/bank.svg";
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  summary("STRUCTURES summary", { structures: data.structures.length, refreshedImages });
}

async function main() {
  banner("Data Enricher", "Wiki properties, image links, and derived metadata for every fetched dataset");
  detail("cwd", process.cwd());
  const handledDatasets = [
    ...FLAT_WIKI_DATASETS.map(({ fileName }) => fileName),
    "objectives",
    "enemies",
    "structures",
  ];
  assertDatasetCoverage("enrichData", handledDatasets, WIKI_DATASET_NAMES);

  let failures = 0;
  for (const dataset of FLAT_WIKI_DATASETS) failures += await processArray(dataset);
  await processObjectives();
  await processBestiary();
  await processStructures();

  if (failures) throw new Error(`Data enrichment completed with ${failures} failed or missing wiki operation(s).`);
  note("All data processed successfully", "success");
}

main().catch((error: unknown) => {
  note(`Fatal error: ${errorMessage(error)}`, "error");
  process.exitCode = 1;
});
