import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";

const BASE_URL = "https://helldivers.wiki.gg";

function normalizeName(value) {
  return value?.trim().toLowerCase();
}

function canonicalizeName(value) {
  return normalizeName(value)?.replace(/[^a-z0-9]+/g, "") ?? "";
}

function toInternalName(displayName) {
  return displayName.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getImageFileName(wikiImageUrl) {
  return wikiImageUrl.split("/").pop()?.replace(/\?.*/, "");
}

function createDefaultItem(fileName, scrapedItem) {
  const defaultTags =
    fileName === "armor_passives"
      ? ["ArmorPassive"]
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
      category: "Supply",
      tags: [],
    };
  }

  const categoryMap = {
    primaries: "primary",
    secondaries: "secondary",
    throwables: "throwable",
    boosters: "booster",
    armor_passives: "armor",
  };

  const tagsMap = {
    armor_passives: defaultTags,
  };

  return {
    ...shared,
    type: "Equipment",
    category: categoryMap[fileName] ?? "",
    tags: tagsMap[fileName] ?? defaultTags,
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

function findBestScrapedMatch(existingItem, scrapedItems, usedScrapedIndexes) {
  const normalizedExistingName = normalizeName(existingItem.displayName);
  const canonicalExistingName = canonicalizeName(existingItem.displayName);

  for (const [index, scrapedItem] of scrapedItems.entries()) {
    if (usedScrapedIndexes.has(index)) {
      continue;
    }

    if (normalizeName(scrapedItem.displayName) === normalizedExistingName) {
      return { index, scrapedItem, matchType: "exact" };
    }
  }

  if (!canonicalExistingName) {
    return null;
  }

  const similarMatches = scrapedItems.filter((scrapedItem, index) => {
    if (usedScrapedIndexes.has(index)) {
      return false;
    }

    const canonicalScrapedName = canonicalizeName(scrapedItem.displayName);
    return (
      canonicalScrapedName &&
      (canonicalExistingName.includes(canonicalScrapedName) ||
        canonicalScrapedName.includes(canonicalExistingName))
    );
  });

  if (similarMatches.length !== 1) {
    return null;
  }

  const [scrapedItem] = similarMatches;
  const index = scrapedItems.indexOf(scrapedItem);
  return { index, scrapedItem, matchType: "similar" };
}

function detectWeaponCategory($, element) {
  const panelIds = $(element)
    .parents('article.tabber__panel[role="tabpanel"]')
    .map((_, panel) => $(panel).attr("id"))
    .get()
    .filter(Boolean);
  const categoryPanelId = panelIds[1] ?? "";

  if (/^primary-/i.test(categoryPanelId)) {
    return "primary";
  }

  if (/^secondary-/i.test(categoryPanelId)) {
    return "secondary";
  }

  if (/^throwable-/i.test(categoryPanelId)) {
    return "throwable";
  }

  return null;
}

function detectWeaponTag($, element) {
  const panelId = $(element)
    .closest('article.tabber__panel[role="tabpanel"]')
    .attr("id") ?? "";
  const tag = panelId.replace(/-\d+$/i, "").trim();

  if (!tag || /^(primary|secondary|throwable)$/i.test(tag)) {
    return null;
  }

  return tag;
}

/**
 * Fetch a page and return a Cheerio instance
 */
async function fetchHTML(url) {
  const { data } = await axios.get(url);
  return cheerio.load(data);
}

/**
 * Extract data for Weapons (primaries/secondaries/throwables)
 */
async function parseWeapons(url) {
  const $ = await fetchHTML(url);
  const results = [];

  $("li.gallerybox").each((_, el) => {
    const anchor = $(el).find(".gallerytext a").first();
    const img = $(el).find("img").first();

    const displayName = anchor.attr("title")?.trim() || anchor.text().trim();
    const wikiSlug = anchor.attr("href").replace("/wiki/", "");
    const wikiImageUrl = BASE_URL + img.attr("src").replace(/\?.*/, "");
    const weaponCategory = detectWeaponCategory($, el);
    const weaponTag = detectWeaponTag($, el);

    results.push({ displayName, wikiSlug, wikiImageUrl, weaponCategory, weaponTag });
  });

  return results;
}

/**
 * Extract Stratagems
 */
async function parseStratagems(url) {
  const $ = await fetchHTML(url);
  const results = [];

  $("table tr").each((_, el) => {
    const anchor = $(el).find("td a[title]").first();
    const img = $(el).find("td a.image[href]").first();

    if (anchor.length) {
      const displayName = anchor.attr("title").trim();
      const wikiSlug = anchor.attr("href").replace("/wiki/", "");
      const wikiImageUrl = BASE_URL + `/images/${img.attr("href")}`.replace("/wiki/File:", "");
      results.push({ displayName, wikiSlug, wikiImageUrl });
    }
  });

  return results;
}

/**
 * Extract Boosters
 */
async function parseBoosters(url) {
  const $ = await fetchHTML(url);
  const results = [];

  $("table tr").each((_, el) => {
    const anchor = $(el).find("td a[title]").first();

    if (anchor.length) {
      const displayName = anchor.attr("title").trim();
      const wikiSlug = anchor.attr("href").replace("/wiki/", "");
      const wikiImageUrl = BASE_URL + `/images/${displayName.replaceAll(" ", "_")}_Booster_Icon.svg`;
      results.push({ displayName, wikiSlug, wikiImageUrl });
    }
  });

  return results;
}

/**
 * Extract Armor Passives
 */
async function parseArmorPassives(url) {
  const $ = await fetchHTML(url);
  const results = [];

  $("big").each((_, el) => {
    const anchor = $(el).find("a[title]").last();

    if (anchor.length) {
      const displayName = anchor.attr("title").trim();
      const wikiSlug = anchor.attr("href").replace("/wiki/", "");
      const wikiImageUrl = BASE_URL + `/images/${displayName.replaceAll(" ", "_")}_Armor_Passive_Icon.png`;
      results.push({ displayName, wikiSlug, wikiImageUrl });
    }
  });

  return results;
}

/**
 * Merge scraped data into existing JSON data and save back
 */
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
    if (match) {
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

      return updatedItem;
    }

    removedItems.push(item.displayName);
    return item;
  });

  const insertedItems = relevantScrapedData
    .filter((_, index) => !usedScrapedIndexes.has(index))
    .map((item) => createDefaultItem(fileName, item));

  const output = [...merged, ...insertedItems];

  await fs.writeFile(filePath, JSON.stringify(output, null, 2));
  console.log(
    `Updated ${arrayName} → ${filePath} (${merged.length} existing, ${insertedItems.length} inserted, ${removedItems.length} removed, ${renamedItems} renamed)`
  );

  if (removedItems.length) {
    console.warn(`Potentially removed ${arrayName}: ${removedItems.join(", ")}`);
  }

  if (renamedItems) {
    console.log(`Matched ${renamedItems} ${arrayName} item(s) by similar name.`);
  }
}

/**
 * Main entry point
 */
async function main() {
  const [weapons, stratagems, boosters, passives] = await Promise.all([
    parseWeapons(`${BASE_URL}/wiki/Weapons`),
    parseStratagems(`${BASE_URL}/wiki/Stratagems`),
    parseBoosters(`${BASE_URL}/wiki/Boosters`),
    parseArmorPassives(`${BASE_URL}/wiki/Armor_Passives`),
  ]);

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
