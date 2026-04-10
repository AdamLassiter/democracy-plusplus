/* eslint-disable no-undef */

import axios, { type AxiosError } from "axios";
import fs from "fs/promises";
import path from "path";
import readline from "readline";

interface DownloadableItem {
  wikiImageUrl?: string | null;
  imageUrl?: string;
  [key: string]: unknown;
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function ask(q: string) {
  return new Promise<string>((resolve) => rl.question(q, (ans: string) => resolve(ans.trim())));
}

async function downloadImage(imageUrl: string, folder: string, maxRetries = 6): Promise<string | undefined> {
  const filename = path.basename(imageUrl.split("?")[0]);
  const destDir = path.resolve("public/images", folder);
  await fs.mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, filename).replace(/%[0-9]{2}/, "");

  try {
    await fs.access(destPath);
    return `${folder}/${filename}`;
  } catch {
    // File does not exist yet.
  }

  let attempt = 0;
  let delay = 2000;

  while (attempt <= maxRetries) {
    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, { responseType: "arraybuffer" });
      await fs.writeFile(destPath, new Uint8Array(response.data));
      console.log(`Saved ${folder}/${filename}`);
      return `${folder}/${filename}`;
    } catch (error) {
      if (!isAxiosError(error)) {
        console.error(`Failed to download ${filename}: ${String(error)}`);
        return undefined;
      }

      if (error.response?.status === 429) {
        console.warn(`429 rate limit for ${filename}, waiting ${delay / 1000}s before retry...`);
        await sleep(delay);
        attempt++;
        delay *= 2;
        continue;
      }

      if (error.response?.status === 404) {
        console.warn(`404 not found for ${filename}.`);
        const newImageUrl = await ask(`New imageUrl (${imageUrl})? `);
        if (newImageUrl) {
          return downloadImage(newImageUrl, folder, maxRetries);
        }

        console.warn(`Skipping ${filename}`);
        return undefined;
      }

      console.error(`Failed to download ${filename}: ${error.message}`);
      return undefined;
    }
  }

  console.error(`Max retries reached for ${filename}. Skipping.`);
  return undefined;
}

async function downloadAll(fileName: string, name: string) {
  const dataDir = path.resolve("public/data");
  await fs.mkdir(dataDir, { recursive: true });

  const filePath = path.join(dataDir, `${fileName}.json`);
  console.log(`Reading ${filePath}...`);

  let items: DownloadableItem[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    items = JSON.parse(raw) as DownloadableItem[];
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
  console.log(`Saved updated ${name} -> ${outputFile}`);
}

async function main() {
  await downloadAll("primaries", "PRIMARIES");
  await downloadAll("secondaries", "SECONDARIES");
  await downloadAll("throwables", "THROWABLES");
  await downloadAll("stratagems", "STRATAGEMS");
  await downloadAll("boosters", "BOOSTERS");
  await downloadAll("armor_passives", "ARMOR_PASSIVES");

  rl.close();
  console.log("All image downloads complete!");
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err);
  rl.close();
});
