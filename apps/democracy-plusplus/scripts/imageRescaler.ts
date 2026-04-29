import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { banner, createTask, detail, errorMessage, item, note, section, summary } from "./terminalUi.ts";

const BASE_DIR = path.resolve("public/images");
const MAX_SIZE_BYTES = 1;
const RESIZE_WIDTH = 640;
const OVERWRITE = true;

interface FolderStats {
  scanned: number;
  resized: number;
  skipped: number;
  failed: number;
}

async function processFolder(folderPath: string, totals: FolderStats): Promise<void> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      section("Folder", path.relative(BASE_DIR, fullPath) || ".");
      await processFolder(fullPath, totals);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      totals.scanned++;
      const fileStats = await fs.stat(fullPath);

      if (fileStats.size > MAX_SIZE_BYTES) {
        try {
          const image = sharp(fullPath);
          const metadata = await image.metadata();

          if (metadata.width && metadata.width <= RESIZE_WIDTH) {
            item(entry.name, `already ${metadata.width}px wide`, "muted");
            totals.skipped++;
            continue;
          }

          const newFilename = `${path.basename(entry.name, ".png")}.small.png`;
          const newFilePath = path.join(folderPath, newFilename);
          const task = createTask(`Rescaling ${entry.name}`, path.relative(BASE_DIR, folderPath) || ".");

          await image
            .resize({ width: RESIZE_WIDTH })
            .png({ quality: 85 })
            .toFile(newFilePath);

          const newStats = await fs.stat(newFilePath);

          if (OVERWRITE) {
            await fs.rename(newFilePath, fullPath);
          }

          task.succeed(
            `${metadata.width ?? "?"}→${RESIZE_WIDTH}px · ${(fileStats.size / 1024).toFixed(0)}KB→${(newStats.size / 1024).toFixed(0)}KB`,
          );
          totals.resized++;
        } catch (error) {
          item(entry.name, errorMessage(error), "error");
          totals.failed++;
        }
      } else {
        item(entry.name, `${(fileStats.size / 1024).toFixed(0)}KB already under limit`, "muted");
        totals.skipped++;
      }
    }
  }
}

async function main() {
  try {
    banner("Image Rescaler", "Compact per-file results with visible resize savings");
    detail("baseDir", BASE_DIR);
    detail("target", `${RESIZE_WIDTH}px`);
    const totals: FolderStats = { scanned: 0, resized: 0, skipped: 0, failed: 0 };
    await processFolder(BASE_DIR, totals);
    summary("Image rescale summary", totals);
    note("All images processed", "success");
  } catch (error) {
    note(`Fatal error: ${errorMessage(error)}`, "error");
  }
}

main();
