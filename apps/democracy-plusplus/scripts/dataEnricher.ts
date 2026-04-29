import fs from "fs/promises";
import type { ItemProperties, ObjectiveTag } from "../src/types.ts";
import {
  expandTemplate,
  extractInfoboxImageFile,
  fetchPageSources,
  findAttackTemplateInvocation,
  getImageFileName,
  parseExpandedAttackTables,
  resolveImageUrls,
} from "./wikiApi.ts";
import { banner, createTask, detail, errorMessage, item, note, section, summary } from "./terminalUi.ts";

interface EnrichableItem {
  displayName: string;
  wikiSlug: string;
  wikiImageUrl?: string | null;
  imageUrl?: string;
  properties?: ItemProperties;
  hoverTexts?: unknown;
  [key: string]: unknown;
}

function getObjectiveModeTag(displayName: string): ObjectiveTag | undefined {
  if (displayName.includes("Eradicate")) {
    return "Eradicate";
  }
  if (displayName.includes("Commando")) {
    return "Commando";
  }
  if (displayName.includes("Blitz")) {
    return "Blitz";
  }

  return undefined;
}

function mergeTags(existingTags: unknown, modeTag: ObjectiveTag | undefined) {
  const tags = Array.isArray(existingTags) ? existingTags.filter((tag): tag is string => typeof tag === "string") : [];
  const normalizedTags = tags.filter((tag) => !["Eradicate", "Commando", "Blitz"].includes(tag));

  if (modeTag) {
    normalizedTags.push(modeTag);
  }

  return normalizedTags.length ? [...new Set(normalizedTags)] : undefined;
}

async function processArray(fileName: string, name: string) {
  const filePath = `./public/data/${fileName}.json`;

  const loadTask = createTask(`Loading ${name}`, filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];
  loadTask.succeed(`${items.length} records`);

  const fetchTask = createTask(`Fetching sources`, name);
  const pages = await fetchPageSources(items.map((record) => record.wikiSlug));
  fetchTask.succeed(`${pages.size} pages`);

  section(`Processing ${name}`, `${items.length} items`);
  let processed = 0;
  let refreshedImages = 0;
  let missingPages = 0;
  let missingTemplates = 0;
  let emptyProperties = 0;
  let failures = 0;

  for (const record of items) {
    const page = pages.get(record.wikiSlug);
    if (!page) {
      missingPages++;
      item(record.displayName || record.wikiSlug, "missing wiki source", "warn");
      continue;
    }

    const imageFile = extractInfoboxImageFile(page.content, page.title);
    if (imageFile) {
      const imageUrls = await resolveImageUrls([imageFile]);
      const wikiImageUrl = imageUrls.get(imageFile);
      if (wikiImageUrl) {
        record.wikiImageUrl = wikiImageUrl;
        const imageFileName = getImageFileName(wikiImageUrl);
        if (imageFileName) {
          record.imageUrl = `${fileName}/${imageFileName}`;
        }
        refreshedImages++;
      }
    }

    record.displayName = page.title;
    record.wikiSlug = page.slug;

    const attackTemplate = findAttackTemplateInvocation(page.content);
    if (!attackTemplate) {
      missingTemplates++;
      item(record.displayName, "no attack template", "warn");
      continue;
    }

    try {
      const expanded = await expandTemplate(attackTemplate, page.title);
      const properties = parseExpandedAttackTables(expanded);
      if (!Object.keys(properties).length) {
        emptyProperties++;
        item(record.displayName, "no structured properties", "warn");
        continue;
      }

      record.properties = properties;
      if (record.hoverTexts) {
        delete record.hoverTexts;
      }
      processed++;
      item(record.displayName, `${Object.keys(properties).length} property groups`, "success");
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
    missingPages,
    missingTemplates,
    emptyProperties,
    failures,
  });
}

async function processObjectives() {
  const filePath = "./public/data/objectives.json";

  const loadTask = createTask("Loading OBJECTIVES", filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];
  loadTask.succeed(`${items.length} records`);

  section("Processing OBJECTIVES", `${items.length} items`);
  let tagged = 0;
  let cleared = 0;

  for (const record of items) {
    const modeTag = getObjectiveModeTag(record.displayName);
    const tags = mergeTags(record.tags, modeTag);

    if (tags) {
      record.tags = tags;
      tagged++;
    } else {
      delete record.tags;
      cleared++;
    }
  }

  const saveTask = createTask("Saving OBJECTIVES", filePath);
  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  saveTask.succeed("written");
  summary("OBJECTIVES summary", { tagged, cleared });
}

async function main() {
  banner("Data Enricher", "Wiki properties, image links, and objective tag cleanup");
  detail("cwd", process.cwd());
  await processArray("primaries", "PRIMARIES");
  await processArray("secondaries", "SECONDARIES");
  await processArray("throwables", "THROWABLES");
  await processArray("stratagems", "STRATAGEMS");
  await processObjectives();

  note("All data processed successfully", "success");
}

main().catch((err: unknown) => {
  note(`Fatal error: ${errorMessage(err)}`, "error");
});
