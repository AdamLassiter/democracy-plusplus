import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";

const BASE_URL = "https://helldivers.wiki.gg";

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

    results.push({ displayName, wikiSlug, wikiImageUrl });
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

  const merged = existingArray.map((item) => {
    const match = scrapedData.find(
      (x) => x.displayName?.toLowerCase() === item.displayName?.toLowerCase()
    );
    if (match) {
      item.wikiSlug = match.wikiSlug;
      item.wikiImageUrl = match.wikiImageUrl;
    }
    return item;
  });

  await fs.writeFile(filePath, JSON.stringify(merged, null, 2));
  console.log(`Updated ${arrayName} → ${filePath}`);
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
