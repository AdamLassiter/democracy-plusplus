import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const BASE_DIR = path.resolve("public/images"); // root folder with subfolders
// const MAX_SIZE_BYTES = 512 * 1024; // 512KB
const MAX_SIZE_BYTES = 1; // 1B
const RESIZE_WIDTH = 640; // target width in pixels
const OVERWRITE = true;

async function processFolder(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      await processFolder(fullPath); // recursive
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      const stats = await fs.stat(fullPath);

      if (stats.size > MAX_SIZE_BYTES) {
        try {
          const image = sharp(fullPath);
          const metadata = await image.metadata();

          // Skip if already at or below target width
          if (metadata.width && metadata.width <= RESIZE_WIDTH) {
            console.log(
              `Skipping ${entry.name}: already ${metadata.width}px wide`
            );
            continue;
          }

          const newFilename =
            path.basename(entry.name, ".png") + ".small.png";
          const newFilePath = path.join(folderPath, newFilename);

          await image
            .resize({ width: RESIZE_WIDTH })
            .png({ quality: 85 }) // adjust quality as needed
            .toFile(newFilePath);

          const newStats = await fs.stat(newFilePath);

          if (OVERWRITE) {
            await fs.rename(newFilePath, fullPath);
          }

          console.log(
            `Rescaled ${entry.name} (${metadata.width}→${RESIZE_WIDTH}px, ${(stats.size / 1024).toFixed(
              0
            )} KB → ${(newStats.size / 1024).toFixed(0)} KB)`
          );
        } catch (err) {
          console.error(`Failed to process ${entry.name}: ${err.message}`);
        }
      }
    }
  }
}

async function main() {
  try {
    await processFolder(BASE_DIR);
    console.log("\nAll images processed");
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

main();
