import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BASE_DIR = path.resolve("public/images");
const MAX_SIZE_BYTES = 1;
const RESIZE_WIDTH = 640;
const OVERWRITE = true;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function processFolder(folderPath: string): Promise<void> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      await processFolder(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      const stats = await fs.stat(fullPath);

      if (stats.size > MAX_SIZE_BYTES) {
        try {
          const image = sharp(fullPath);
          const metadata = await image.metadata();

          if (metadata.width && metadata.width <= RESIZE_WIDTH) {
            console.log(`Skipping ${entry.name}: already ${metadata.width}px wide`);
            continue;
          }

          const newFilename = `${path.basename(entry.name, ".png")}.small.png`;
          const newFilePath = path.join(folderPath, newFilename);

          await image
            .resize({ width: RESIZE_WIDTH })
            .png({ quality: 85 })
            .toFile(newFilePath);

          const newStats = await fs.stat(newFilePath);

          if (OVERWRITE) {
            await fs.rename(newFilePath, fullPath);
          }

          console.log(
            `Rescaled ${entry.name} (${metadata.width}→${RESIZE_WIDTH}px, ${(stats.size / 1024).toFixed(0)} KB -> ${(newStats.size / 1024).toFixed(0)} KB)`,
          );
        } catch (error) {
          console.error(`Failed to process ${entry.name}: ${errorMessage(error)}`);
        }
      }
    }
  }
}

async function main() {
  try {
    await processFolder(BASE_DIR);
    console.log("\nAll images processed");
  } catch (error) {
    console.error("Fatal error:", error);
  }
}

main();
