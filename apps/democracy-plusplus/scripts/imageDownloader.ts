 

import axios, { type AxiosError } from "axios";
import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { banner, createTask, errorMessage, item, note, promptLabel, section, summary } from "./terminalUi.ts";

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
    item(filename, "already cached", "muted");
    return `${folder}/${filename}`;
  } catch {
    // File does not exist yet.
  }

  let attempt = 0;
  let delay = 2000;
  const task = createTask(`Downloading ${filename}`, folder);

  while (attempt <= maxRetries) {
    try {
      const response = await axios.get<ArrayBuffer>(imageUrl, { responseType: "arraybuffer" });
      await fs.writeFile(destPath, new Uint8Array(response.data));
      task.succeed(`${folder}/${filename}`);
      return `${folder}/${filename}`;
    } catch (error) {
      if (!isAxiosError(error)) {
        task.fail(errorMessage(error));
        return undefined;
      }

      if (error.response?.status === 429) {
        task.update(`rate limited · retry in ${delay / 1000}s · ${attempt + 1}/${maxRetries}`);
        await sleep(delay);
        attempt++;
        delay *= 2;
        continue;
      }

      if (error.response?.status === 404) {
        task.warn("404 not found");
        const newImageUrl = await ask(promptLabel(`New imageUrl (${imageUrl})?`));
        if (newImageUrl) {
          return downloadImage(newImageUrl, folder, maxRetries);
        }

        item(filename, "skipped after 404", "warn");
        return undefined;
      }

      task.fail(error.message);
      return undefined;
    }
  }

  task.fail("max retries reached");
  return undefined;
}

async function downloadAll(fileName: string, name: string) {
  const dataDir = path.resolve("public/data");
  await fs.mkdir(dataDir, { recursive: true });

  const filePath = path.join(dataDir, `${fileName}.json`);
  const loadTask = createTask(`Loading ${name}`, filePath);

  let items: DownloadableItem[] = [];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    items = JSON.parse(raw) as DownloadableItem[];
    loadTask.succeed(`${items.length} records`);
  } catch {
    loadTask.warn("starting with empty list");
  }

  section(`Downloading ${name}`, `${items.length} items`);
  let attempted = 0;
  let updated = 0;
  let missing = 0;
  for (const record of items) {
    if (record.wikiImageUrl) {
      attempted++;
      const imagePath = await downloadImage(record.wikiImageUrl, fileName);
      if (imagePath) {
        record.imageUrl = imagePath;
        updated++;
      }
    } else {
      missing++;
    }
  }

  const outputFile = path.join(dataDir, `${fileName}.json`);
  const saveTask = createTask(`Saving ${name}`, outputFile);
  await fs.writeFile(outputFile, JSON.stringify(items, null, 2));
  saveTask.succeed("written");
  summary(`${name} summary`, { attempted, updated, missing });
}

async function main() {
  banner("Image Downloader", "Cache-aware downloads with prompts and retry telemetry");
  await downloadAll("primaries", "PRIMARIES");
  await downloadAll("secondaries", "SECONDARIES");
  await downloadAll("throwables", "THROWABLES");
  await downloadAll("stratagems", "STRATAGEMS");
  await downloadAll("boosters", "BOOSTERS");
  await downloadAll("armor_passives", "ARMOR_PASSIVES");

  rl.close();
  note("All image downloads complete", "success");
}

main().catch((err: unknown) => {
  note(`Fatal error: ${errorMessage(err)}`, "error");
  rl.close();
});
