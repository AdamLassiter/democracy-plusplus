/* eslint-disable no-undef */

import axios from "axios";
import fs from "fs/promises";
import path from "path";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ask(q) {
  return new Promise((resolve) => rl.question(q, (ans) => resolve(ans.trim())));
}

/**
 * Downloads a single image to the specified folder.
 */
async function downloadImage(imageUrl, folder, maxRetries = 6) {
  const filename = path.basename(imageUrl.split("?")[0]);
  const destDir = path.resolve("public/images", folder);
  await fs.mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, filename).replace(/%[0-9]{2}/, "");

  // Skip if file already exists
  try {
    await fs.access(destPath);
    return `${folder}/${filename}`;
  // eslint-disable-next-line no-unused-vars
  } catch (_error) {
    // file doesn't exist — continue
  }

  let attempt = 0;
  let delay = 2000; // start with 2 seconds

  while (attempt <= maxRetries) {
    try {
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      await fs.writeFile(destPath, response.data);
      console.log(`Saved ${folder}/${filename}`);
      return `${folder}/${filename}`;
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn(`429 rate limit for ${filename}, waiting ${delay / 1000}s before retry...`);
        await sleep(delay);
        attempt++;
        delay *= 2;
        continue;
      } else if (err.response?.status === 404) {
        console.warn(`404 not found for ${filename}.`);
        const newImageUrl = await ask(`New imageUrl (${imageUrl})? `);
        if (newImageUrl) {
          return await downloadImage(newImageUrl, folder, maxRetries);
        } else {
          console.warn(`Skipping ${filename}`);
          return;
        }
      } else {
        console.error(`Failed to download ${filename}: ${err.message}`);
        return;
      }
    }
  }

  console.error(`Max retries reached for ${filename}. Skipping.`);
}

/**
 * Reads a JSON array, downloads images, and saves updated JSON.
 */
async function downloadAll(fileName, name) {
  const dataDir = path.resolve("public/data");
  await fs.mkdir(dataDir, { recursive: true });

  const filePath = path.join(dataDir, `${fileName}.json`);
  console.log(`Reading ${filePath}...`);

  let items = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    items = JSON.parse(raw);
  } catch {
    console.warn(`${filePath} not found. Starting with empty list.`);
  }

  for (const item of items) {
    if (item.wikiImageUrl) {
      item.imageUrl = await downloadImage(item.wikiImageUrl, fileName);
    }
  }

  const outputFile = path.join(dataDir, `${fileName}.json`);
  await fs.writeFile(outputFile, JSON.stringify(items, null, 2));
  console.log(`Saved updated ${name} → ${outputFile}`);
}

/**
 * Main entry point
 */
async function main() {
  await downloadAll("primaries", "PRIMARIES");
  await downloadAll("secondaries", "SECONDARIES");
  await downloadAll("throwables", "THROWABLES");
  await downloadAll("stratagems", "STRATAGEMS");
  await downloadAll("boosters", "BOOSTERS");
  await downloadAll("armor_passives", "ARMOR_PASSIVES");

  rl.close();
  console.log("✅ All image downloads complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  rl.close();
});
