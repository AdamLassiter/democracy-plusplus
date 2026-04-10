import fs from "fs/promises";
import type { EquipmentCategory, ItemType, StratagemCategory, Tier } from "../src/types.ts";
import {
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

type EquipmentFileName = Exclude<DataFileName, "stratagems">;

interface StoredItem {
  displayName: string;
  warbondCode: string;
  internalName: string;
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

const CATEGORY_MAP: Record<EquipmentFileName, EquipmentCategory> = {
  primaries: "primary",
  secondaries: "secondary",
  throwables: "throwable",
  boosters: "booster",
  armor_passives: "armor",
};

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
    };
  }

  return {
    ...shared,
    type: "Equipment",
    category: CATEGORY_MAP[fileName],
    tags: defaultTags,
  };
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
      if (match.scrapedItem.stratagemTag) {
        updatedItem.tags = [match.scrapedItem.stratagemTag];
      }
    } else if (isWeaponItem(match.scrapedItem) && match.scrapedItem.weaponTag) {
      updatedItem.tags = [match.scrapedItem.weaponTag];
    }

    return updatedItem;
  });

  const insertedItems = relevantScrapedData
    .filter((_, index) => !usedScrapedIndexes.has(index))
    .map((item) => createDefaultItem(fileName, item));

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
}

main().catch(console.error);
