import fs from "fs/promises";
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
} from "./wikiApi.ts";

function createDefaultItem(fileName, scrapedItem) {
  const defaultTags =
    fileName === "armor_passives"
      ? ["ArmorPassive"]
      : fileName === "stratagems"
        ? scrapedItem.stratagemTag
          ? [scrapedItem.stratagemTag]
          : []
        : scrapedItem.weaponTag
          ? [scrapedItem.weaponTag]
          : [];

  const shared = {
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
      category: scrapedItem.stratagemCategory ?? "Supply",
      tags: defaultTags,
    };
  }

  const categoryMap = {
    primaries: "primary",
    secondaries: "secondary",
    throwables: "throwable",
    boosters: "booster",
    armor_passives: "armor",
  };

  return {
    ...shared,
    type: "Equipment",
    category: categoryMap[fileName] ?? "",
    tags: defaultTags,
  };
}

function getScrapedItemsForFile(fileName, scrapedData) {
  if (fileName === "primaries") {
    return scrapedData.filter((item) => item.weaponCategory === "primary");
  }

  if (fileName === "secondaries") {
    return scrapedData.filter((item) => item.weaponCategory === "secondary");
  }

  if (fileName === "throwables") {
    return scrapedData.filter((item) => item.weaponCategory === "throwable");
  }

  return scrapedData;
}

async function enrichWithImageUrls(items) {
  const imageUrls = await resolveImageUrls(items.map((item) => item.imageFileTitle));

  return items.map((item) => ({
    ...item,
    wikiImageUrl: imageUrls.get(item.imageFileTitle) ?? item.wikiImageUrl ?? null,
  }));
}

async function mergeData(fileName, scrapedData, arrayName) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  let existingArray = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    existingArray = JSON.parse(raw);
  } catch {
    console.warn(`File ${filePath} not found, starting with empty array.`);
  }

  const relevantScrapedData = getScrapedItemsForFile(fileName, scrapedData);
  const usedScrapedIndexes = new Set();
  const removedItems = [];
  let renamedItems = 0;

  const merged = existingArray.map((item) => {
    const match = findBestScrapedMatch(item, relevantScrapedData, usedScrapedIndexes);
    if (!match) {
      removedItems.push(item.displayName);
      return item;
    }

    usedScrapedIndexes.add(match.index);
    if (match.matchType === "similar") {
      renamedItems++;
    }

    const updatedItem = {
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

    if (fileName === "stratagems") {
      updatedItem.category = match.scrapedItem.stratagemCategory ?? updatedItem.category;
      if (match.scrapedItem.stratagemTag) {
        updatedItem.tags = [match.scrapedItem.stratagemTag];
      }
    } else if (match.scrapedItem.weaponTag) {
      updatedItem.tags = [match.scrapedItem.weaponTag];
    }

    return updatedItem;
  });

  const insertedItems = relevantScrapedData
    .filter((_, index) => !usedScrapedIndexes.has(index))
    .map((item) => createDefaultItem(fileName, item));

  const output = [...merged, ...insertedItems].map((item) => {
    if (item.hoverTexts) {
      delete item.hoverTexts;
    }
    return item;
  });

  await fs.writeFile(filePath, JSON.stringify(output, null, 2));
  console.log(
    `Updated ${arrayName} → ${filePath} (${merged.length} existing, ${insertedItems.length} inserted, ${removedItems.length} removed, ${renamedItems} renamed)`
  );

  if (removedItems.length) {
    console.warn(`Potentially removed ${arrayName}: ${removedItems.join(", ")}`);
  }
}

async function main() {
  const [weaponsPage, stratagemsPage, boostersPage, passivesPage] = await Promise.all([
    fetchPageSource("Weapons"),
    fetchPageSource("Stratagems"),
    fetchPageSource("Boosters"),
    fetchPageSource("Armor Passives"),
  ]);

  const weapons = await enrichWithImageUrls(parseWeaponsPageSource(weaponsPage.content));
  const stratagems = await enrichWithImageUrls(
    await parseStratagemsPageSource(stratagemsPage.content)
  );
  const boosters = await enrichWithImageUrls(parseBoostersPageSource(boostersPage.content));
  const passives = await enrichWithImageUrls(
    await parseArmorPassivesPageSource(passivesPage.content)
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
