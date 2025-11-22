/* eslint-disable no-undef */

import fs from "fs/promises";
import { JSDOM } from "jsdom";

function parseHoverTables(item) {
  const result = {};

  for (const html of item.hoverTexts) {
    const doc = new JSDOM(html).window.document;
    const table = doc.querySelector("table");
    if (!table) continue;

    const rows = [...table.querySelectorAll("tr")];

    let tableTitle = null;
    let currentSection = "Base";

    for (const row of rows) {
      const ths = row.querySelectorAll("th");
      const tds = row.querySelectorAll("td");

      // Table title (appears as <th colspan="2">TITLE</th>)
      if (ths.length === 1 && ths[0].hasAttribute("colspan")) {
        const text = ths[0].textContent.trim();
        if (!tableTitle) {
          tableTitle = text;
          if (!result[tableTitle]) result[tableTitle] = {};
        } else {
          // Section header (<th colspan="2">Damage</th>)
          currentSection = text || "Base";
          if (!result[tableTitle][currentSection]) {
            result[tableTitle][currentSection] = {};
          }
        }
        continue;
      }

      // Standard key/value row (<td>Label</td><td>Value</td>)
      if (tds.length === 2) {
        const key = cleanText(tds[0].textContent);
        const value = cleanText(tds[1].textContent);

        if (!result[tableTitle][currentSection]) {
          result[tableTitle][currentSection] = {};
        }

        result[tableTitle][currentSection][key] = value;
      }
    }
  }

  return result;
}

// Clean up text: remove newlines, excess spaces
function cleanText(str) {
  return str.replace(/\s+/g, " ").trim();
}

async function processArray(fileName, name) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw);

  console.log(`=== Processing ${name} (${items.length} items) ===`);
  if (process.argv.includes("--query")) {

    const query = process.argv[3];
    const sorted = sortItemsByField(items, query);
    console.log(sorted);

  } else {

    for (const item of items) {
      try {
        var parsed = parseHoverTables(item);
        item.properties = parsed;
      } catch (err) {
        console.error(`Skipped ${item.displayName || item.wikiSlug}: ${err.message}`);
      }
    }

    const outputFile = `./public/data/${fileName}.json`;
    await fs.writeFile(outputFile, JSON.stringify(items, null, 2));
    console.log(`Saved updated ${name} → ${outputFile}`);
  }
}

/**
 * Extracts a numeric value from any string.
 * Examples:
 *   "40" → 40
 *   "40%" → 40
 *   "1999 - 0" → 1999
 *   "↔[1.00] ↕[1.00]" → 1.00
 */
function extractNumber(value) {
  if (typeof value !== "string") return 0;
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

/**
 * Searches all nested sections for a given field.
 */
function getFieldValue(item, fieldName) {
  if (!item) return -1;

  for (const [key, value] of Object.entries(item)) {
    if (typeof value === "object") {
      var subValue = getFieldValue(value, fieldName);
      if (subValue >= 0) {
        return subValue;
      }
    }
    if (key.toLowerCase() === fieldName.toLowerCase()) {
      return extractNumber(value);
    }
  }

  return -1; // default if missing
}

/**
 * Sorts an array of parsed items by a given field.
 * 
 * items: [
 *   { displayName: "...", parsed: { ...table data... } },
 *   { displayName: "...", parsed: { ... } }
 * ]
 */
function sortItemsByField(items, fieldName) {
  return items.slice()
    .map(a => ({ displayName: a.displayName, value: getFieldValue(a.properties, fieldName) }))
    .sort((a, b) => b.value - a.value /* descending (highest first) */);
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

  console.log("All data processed successfully");
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
