import fs from "fs/promises";
import readline from "readline";
import type { EquipmentCategory, Faction, ItemType, Objective, ObjectiveTag, StratagemCategory, Tier } from "../src/types.ts";
import {
  fetchMainObjectives,
  fetchPageSource,
  findBestScrapedMatch,
  getImageFileName,
  parseArmorPassivesPageSource,
  parseBoostersPageSource,
  parseStratagemsPageSource,
  parseWeaponsPageSource,
  resolveImageUrls,
  toInternalName,
  type LinkedWikiItem,
  type ScrapedItem,
  type ScrapedStratagemItem,
  type ScrapedWeaponItem,
  type WikiPageSource,
} from "./wikiApi.ts";

type DataFileName =
  | "primaries"
  | "secondaries"
  | "throwables"
  | "stratagems"
  | "boosters"
  | "armor_passives";

type EquipmentFileName = Exclude<DataFileName, "stratagems" | "objectives">;

interface StoredItem {
  displayName: string;
  warbondCode: string;
  internalName: string;
  stratagemCode?: string[];
  tier: Tier;
  wikiSlug?: string;
  wikiImageUrl?: string | null;
  imageUrl?: string;
  type?: ItemType;
  category?: EquipmentCategory | StratagemCategory | "";
  tags?: string[];
  hoverTexts?: unknown;
  [key: string]: unknown;
}

const FACTIONS: Faction[] = ["Terminids", "Automatons", "Illuminate"];

const CATEGORY_MAP: Record<EquipmentFileName, EquipmentCategory> = {
  primaries: "primary",
  secondaries: "secondary",
  throwables: "throwable",
  boosters: "booster",
  armor_passives: "armor",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string) {
  return new Promise<string>((resolve) => rl.question(question, (answer: string) => resolve(answer.trim())));
}

async function confirmAddItem(fileName: string, itemName: string) {
  while (true) {
    const response = (await ask(`Add new ${fileName} item "${itemName}"? [Y/n] `)).toLowerCase();
    if (response === "y" || response === "yes") {
      return true;
    }
    if (response === "n" || response === "no") {
      return false;
    }
    if (response === "") {
      return true;
    }
  }
}

function isStratagemItem(item: ScrapedItem): item is ScrapedStratagemItem {
  return "stratagemCategory" in item;
}

function isWeaponItem(item: ScrapedItem): item is ScrapedWeaponItem {
  return "weaponCategory" in item;
}

function createDefaultItem(fileName: DataFileName, scrapedItem: ScrapedItem): StoredItem {
  const defaultTags =
    fileName === "armor_passives"
      ? ["ArmorPassive"]
      : fileName === "stratagems"
        ? isStratagemItem(scrapedItem) && scrapedItem.stratagemTag
          ? [scrapedItem.stratagemTag]
          : []
        : isWeaponItem(scrapedItem) && scrapedItem.weaponTag
          ? [scrapedItem.weaponTag]
          : [];

  const shared: StoredItem = {
    displayName: scrapedItem.displayName,
    warbondCode: "none",
    internalName: toInternalName(scrapedItem.displayName),
    tier: "d",
    wikiSlug: scrapedItem.wikiSlug,
    wikiImageUrl: scrapedItem.wikiImageUrl,
  };

  const imageFileName = getImageFileName(scrapedItem.wikiImageUrl);
  if (imageFileName) {
    shared.imageUrl = `${fileName}/${imageFileName}`;
  }

  if (fileName === "stratagems") {
    return {
      ...shared,
      type: "Stratagem",
      category: isStratagemItem(scrapedItem) ? scrapedItem.stratagemCategory : "Supply",
      tags: defaultTags,
      stratagemCode: isStratagemItem(scrapedItem) ? scrapedItem.stratagemCode : undefined,
    };
  }

  return {
    ...shared,
    type: "Equipment",
    category: CATEGORY_MAP[fileName],
    tags: defaultTags,
  };
}

function buildObjectiveTags(objective: Objective) {
  const existingTags = objective.tags ?? [];
  const normalizedTags = existingTags.filter((tag): tag is string => !["Eradicate", "Commando", "Blitz"].includes(tag));
  const modeTag = getObjectiveModeTag(objective.displayName);
  const availableFactions = FACTIONS.filter((faction) => objective.tier[faction] !== null);
  if (modeTag) {
    normalizedTags.push(modeTag);
  }

  if (availableFactions.length !== FACTIONS.length) {
    normalizedTags.push(...availableFactions);
  }

  return normalizedTags.length ? [...new Set(normalizedTags)] : undefined;
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

function getScrapedItemsForFile(fileName: DataFileName, scrapedData: ScrapedItem[]) {
  if (fileName === "primaries") {
    return scrapedData.filter((item): item is ScrapedWeaponItem => isWeaponItem(item) && item.weaponCategory === "primary");
  }

  if (fileName === "secondaries") {
    return scrapedData.filter((item): item is ScrapedWeaponItem => isWeaponItem(item) && item.weaponCategory === "secondary");
  }

  if (fileName === "throwables") {
    return scrapedData.filter((item): item is ScrapedWeaponItem => isWeaponItem(item) && item.weaponCategory === "throwable");
  }

  return scrapedData;
}

async function mergeObjectives(arrayName: string) {
  const filePath = "./public/data/objectives.json";

  console.log(`Reading ${filePath}...`);
  let existingObjectives: Objective[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existingObjectives = JSON.parse(raw) as Objective[];
  } catch {
    console.warn(`File ${filePath} not found, starting with empty array.`);
  }

  const scrapedObjectives = await fetchMainObjectives();

  const usedIndexes = new Set<number>();
  const removedObjectives: string[] = [];
  let renamedObjectives = 0;

  const mergedObjectives = existingObjectives.map((objective) => {
    const match = findBestScrapedMatch(objective, scrapedObjectives, usedIndexes);
    if (!match) {
      removedObjectives.push(objective.displayName);
      return objective;
    }

    usedIndexes.add(match.index);
    if (match.matchType === "similar") {
      renamedObjectives++;
    }

    const updatedObjective: Objective = {
      ...objective,
      displayName: match.scrapedItem.displayName,
      wikiSlug: match.scrapedItem.wikiSlug,
      minDifficulty: match.scrapedItem.minDifficulty ?? objective.minDifficulty,
      maxDifficulty: match.scrapedItem.maxDifficulty ?? objective.maxDifficulty,
      missionLength: match.scrapedItem.missionLength ?? objective.missionLength,
    };
    const tags = buildObjectiveTags(updatedObjective);
    if (tags?.length) {
      updatedObjective.tags = tags;
    } else {
      delete updatedObjective.tags;
    }

    return updatedObjective;
  });

  const insertedObjectives: Objective[] = [];
  for (const [index, scrapedObjective] of scrapedObjectives.entries()) {
    if (usedIndexes.has(index)) {
      continue;
    }

    if (await confirmAddItem("objectives", scrapedObjective.displayName)) {
      insertedObjectives.push({
        displayName: scrapedObjective.displayName,
        wikiSlug: scrapedObjective.wikiSlug,
        minDifficulty: scrapedObjective.minDifficulty ?? undefined,
        maxDifficulty: scrapedObjective.maxDifficulty ?? undefined,
        missionLength: scrapedObjective.missionLength ?? undefined,
        tier: {
          Terminids: null,
          Automatons: null,
          Illuminate: null,
        },
      });
    } else {
      console.log(`Skipped new objectives item: ${scrapedObjective.displayName}`);
    }
  }

  const output = [...mergedObjectives, ...insertedObjectives].map((objective) => {
    const tags = buildObjectiveTags(objective);
    if (tags?.length) {
      return { ...objective, tags };
    }

    const { tags: _tags, ...rest } = objective;
    return rest;
  });

  await fs.writeFile(filePath, JSON.stringify(output, null, 2));
  console.log(
    `Updated ${arrayName} -> ${filePath} (${mergedObjectives.length} existing, ${insertedObjectives.length} inserted, ${removedObjectives.length} removed, ${renamedObjectives} renamed)`,
  );

  if (removedObjectives.length) {
    console.warn(`Potentially removed ${arrayName}: ${removedObjectives.join(", ")}`);
  }
}

async function enrichWithImageUrls<T extends LinkedWikiItem>(items: T[]) {
  const imageUrls = await resolveImageUrls(items.map((item) => item.imageFileTitle));

  return items.map((item) => ({
    ...item,
    wikiImageUrl: imageUrls.get(item.imageFileTitle) ?? item.wikiImageUrl ?? null,
  }));
}

async function mergeData(fileName: DataFileName, scrapedData: ScrapedItem[], arrayName: string) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  let existingArray: StoredItem[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existingArray = JSON.parse(raw) as StoredItem[];
  } catch {
    console.warn(`File ${filePath} not found, starting with empty array.`);
  }

  const relevantScrapedData = getScrapedItemsForFile(fileName, scrapedData);
  const usedScrapedIndexes = new Set<number>();
  const removedItems: string[] = [];
  let renamedItems = 0;

  const merged = existingArray.map((item): StoredItem => {
    const match = findBestScrapedMatch(item, relevantScrapedData, usedScrapedIndexes);
    if (!match) {
      removedItems.push(item.displayName);
      return item;
    }

    usedScrapedIndexes.add(match.index);
    if (match.matchType === "similar") {
      renamedItems++;
    }

    const updatedItem: StoredItem = {
      ...item,
      displayName: match.scrapedItem.displayName,
      internalName: toInternalName(match.scrapedItem.displayName),
      wikiSlug: match.scrapedItem.wikiSlug,
      wikiImageUrl: match.scrapedItem.wikiImageUrl,
    };

    const imageFileName = getImageFileName(match.scrapedItem.wikiImageUrl);
    if (imageFileName && item.imageUrl) {
      updatedItem.imageUrl = `${fileName}/${imageFileName}`;
    }

    if (fileName === "stratagems" && isStratagemItem(match.scrapedItem)) {
      updatedItem.category = match.scrapedItem.stratagemCategory;
      updatedItem.stratagemCode = match.scrapedItem.stratagemCode;
      if (match.scrapedItem.stratagemTag) {
        updatedItem.tags = [match.scrapedItem.stratagemTag];
      }
    } else if (isWeaponItem(match.scrapedItem) && match.scrapedItem.weaponTag) {
      updatedItem.tags = [match.scrapedItem.weaponTag];
    }

    return updatedItem;
  });

  const insertedItems: StoredItem[] = [];
  for (const [index, item] of relevantScrapedData.entries()) {
    if (usedScrapedIndexes.has(index)) {
      continue;
    }

    if (await confirmAddItem(fileName, item.displayName)) {
      insertedItems.push(createDefaultItem(fileName, item));
    } else {
      console.log(`Skipped new ${fileName} item: ${item.displayName}`);
    }
  }

  const output = [...merged, ...insertedItems].map((item): StoredItem => {
    if (item.hoverTexts) {
      delete item.hoverTexts;
    }
    return item;
  });

  await fs.writeFile(filePath, JSON.stringify(output, null, 2));
  console.log(
    `Updated ${arrayName} -> ${filePath} (${merged.length} existing, ${insertedItems.length} inserted, ${removedItems.length} removed, ${renamedItems} renamed)`,
  );

  if (removedItems.length) {
    console.warn(`Potentially removed ${arrayName}: ${removedItems.join(", ")}`);
  }
}

async function requirePageSource(title: string): Promise<WikiPageSource> {
  const page = await fetchPageSource(title);
  if (!page) {
    throw new Error(`Missing wiki page source for ${title}`);
  }
  return page;
}

async function main() {
  try {
    const [weaponsPage, stratagemsPage, boostersPage, passivesPage] = await Promise.all([
      requirePageSource("Weapons"),
      requirePageSource("Stratagems"),
      requirePageSource("Boosters"),
      requirePageSource("Armor Passives"),
    ]);

    const weapons = await enrichWithImageUrls(parseWeaponsPageSource(weaponsPage.content));
    const stratagems = await enrichWithImageUrls(
      await parseStratagemsPageSource(stratagemsPage.content),
    );
    const boosters = await enrichWithImageUrls(parseBoostersPageSource(boostersPage.content));
    const passives = await enrichWithImageUrls(
      await parseArmorPassivesPageSource(passivesPage.content),
    );

    console.log("Parsed counts:", {
      weapons: weapons.length,
      stratagems: stratagems.length,
      boosters: boosters.length,
      passives: passives.length,
    });

    await mergeData("primaries", weapons, "PRIMARIES");
    await mergeData("secondaries", weapons, "SECONDARIES");
    await mergeData("throwables", weapons, "THROWABLES");
    await mergeData("stratagems", stratagems, "STRATAGEMS");
    await mergeData("boosters", boosters, "BOOSTERS");
    await mergeData("armor_passives", passives, "ARMOR_PASSIVES");
    await mergeObjectives("OBJECTIVES");
  } finally {
    rl.close();
  }
}

main().catch(console.error);
