/* eslint-disable no-undef */

import fs from "fs/promises";
import readline from "readline";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch HTML for a given wiki slug with retries
 */
async function fetchWikiPage(item, maxRetries = 5) {
  let retries = 0;
  const baseUrl = `https://helldivers.wiki.gg/wiki/${item.wikiSlug}`;
  let url = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;

  const headers = {
    "User-Agent": "MyHelldiversScraper/1.0 (https://adamlassiter.github.io)",
    Accept: "text/html,application/xhtml+xml",
  };

  let delay = 2000; // start with 2 seconds

  while (retries < maxRetries) {
    if (retries > 0) {
      await sleep(delay);
      delay *= 2;
    }
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      return new JSDOM(html).window.document;
    } catch (err) {
      console.warn(
        `Failed to fetch ${item.wikiSlug} (${err.message}), retry ${retries + 1}/${maxRetries}`
      );
      retries++;

      if (retries === maxRetries) {
        const newSlug = await ask(`Enter new wikiSlug for ${item.displayName}: `);
        if (newSlug) {
          item.wikiSlug = newSlug;
          return await fetchWikiPage(item, maxRetries);
        } else {
          throw new Error(`Max retries reached for ${item.displayName}`);
        }
      }
    }
  }
}

/**
 * Process one item by scraping and extracting data
 */
async function processItem(item) {
  var title;
  var tables;

  if (process.argv.includes("--offline")) {
    title = item.displayName;
    tables = item.hoverTexts.map((t) => ({ outerHTML: t }));
  } else {
    const document = await fetchWikiPage(item);
    title = document.querySelector(".mw-page-title-main")?.textContent.trim();
    tables = [...document.querySelectorAll(".table-weapon-stats")];
  }

  if (!title || !tables.length) {
    console.warn(`No weapon table found for ${item.wikiSlug}`);
    const retry = await ask("Retry? (y/n) ");
    if (retry.toLowerCase() === "y") return await processItem(item);
    return;
  }

  item.displayName = title;
  item.hoverTexts = tables.map((t) =>
    t.outerHTML.replaceAll(/ href="[^"]*"/g, "").replaceAll(/<img [^>]*>/g, "")
  );

  console.log(`Processed ${item.displayName}`);
}

/**
 * Read JSON data, process, and write updated JSON
 */
async function processArray(fileName, name) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw);

  console.log(`=== Processing ${name} (${items.length} items) ===`);
  for (const item of items) {
    try {
      await processItem(item);
    } catch (err) {
      console.error(`Skipped ${item.displayName || item.wikiSlug}: ${err.message}`);
    }
  }

  const outputFile = `./public/data/${fileName}.json`;
  await fs.writeFile(outputFile, JSON.stringify(items, null, 2));
  console.log(`Saved updated ${name} → ${outputFile}`);
}

/**
 * Main entry point
 */
async function main() {
  await processArray("primaries", "PRIMARIES");
  await processArray("secondaries", "SECONDARIES");
  await processArray("throwables", "THROWABLES");
  await processArray("stratagems", "STRATAGEMS");
  // await processArray("boosters", "BOOSTERS");
  // await processArray("armor_passives", "ARMOR_PASSIVES");

  rl.close();
  console.log("All data processed successfully");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  rl.close();
});
