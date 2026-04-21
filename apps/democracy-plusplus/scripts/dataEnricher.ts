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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function processArray(fileName: string, name: string) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];
  const pages = await fetchPageSources(items.map((item) => item.wikiSlug));

  console.log(`=== Processing ${name} (${items.length} items) ===`);
  for (const item of items) {
    const page = pages.get(item.wikiSlug);
    if (!page) {
      console.warn(`Missing wiki source for ${item.wikiSlug}`);
      continue;
    }

    const imageFile = extractInfoboxImageFile(page.content, page.title);
    if (imageFile) {
      const imageUrls = await resolveImageUrls([imageFile]);
      const wikiImageUrl = imageUrls.get(imageFile);
      if (wikiImageUrl) {
        item.wikiImageUrl = wikiImageUrl;
        const imageFileName = getImageFileName(wikiImageUrl);
        if (imageFileName) {
          item.imageUrl = `${fileName}/${imageFileName}`;
        }
      }
    }

    item.displayName = page.title;
    item.wikiSlug = page.slug;

    const attackTemplate = findAttackTemplateInvocation(page.content);
    if (!attackTemplate) {
      console.warn(`No attack data template found for ${item.wikiSlug}`);
      continue;
    }

    try {
      const expanded = await expandTemplate(attackTemplate, page.title);
      const properties = parseExpandedAttackTables(expanded);
      if (!Object.keys(properties).length) {
        console.warn(`No structured properties parsed for ${item.wikiSlug}`);
        continue;
      }

      item.properties = properties;
      if (item.hoverTexts) {
        delete item.hoverTexts;
      }
      console.log(`Processed ${item.displayName}`);
    } catch (error) {
      console.error(`Skipped ${item.displayName || item.wikiSlug}: ${errorMessage(error)}`);
    }
  }

  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  console.log(`Saved updated ${name} -> ${filePath}`);
}

async function processObjectives() {
  const filePath = "./public/data/objectives.json";

  console.log(`Reading ${filePath}...`);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw) as EnrichableItem[];

  console.log(`=== Processing OBJECTIVES (${items.length} items) ===`);
  for (const item of items) {
    const modeTag = getObjectiveModeTag(item.displayName);
    const tags = mergeTags(item.tags, modeTag);

    if (tags) {
      item.tags = tags;
    } else {
      delete item.tags;
    }
  }

  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  console.log(`Saved updated OBJECTIVES -> ${filePath}`);
}

async function main() {
  await processArray("primaries", "PRIMARIES");
  await processArray("secondaries", "SECONDARIES");
  await processArray("throwables", "THROWABLES");
  await processArray("stratagems", "STRATAGEMS");
  await processObjectives();

  console.log("All data processed successfully");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
});
