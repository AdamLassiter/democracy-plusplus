import fs from "fs/promises";
import {
  expandTemplate,
  extractInfoboxImageFile,
  fetchPageSources,
  findAttackTemplateInvocation,
  getImageFileName,
  parseExpandedAttackTables,
  resolveImageUrls,
} from "./wikiApi.js";

async function processArray(fileName, name) {
  const filePath = `./public/data/${fileName}.json`;

  console.log(`Reading ${filePath}...`);
  const raw = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(raw);
  const pages = await fetchPageSources(items.map((item) => item.wikiSlug));

  console.log(`=== Processing ${name} (${items.length} items) ===`);
  for (const item of items) {
    const page = pages.get(item.wikiSlug);
    if (!page) {
      console.warn(`Missing wiki source for ${item.wikiSlug}`);
      continue;
    }

    const imageFile = extractInfoboxImageFile(page.content, page.title);
    if (imageFile) {
      const imageUrls = await resolveImageUrls([imageFile]);
      const wikiImageUrl = imageUrls.get(imageFile);
      if (wikiImageUrl) {
        item.wikiImageUrl = wikiImageUrl;
        const imageFileName = getImageFileName(wikiImageUrl);
        if (imageFileName) {
          item.imageUrl = `${fileName}/${imageFileName}`;
        }
      }
    }

    item.displayName = page.title;
    item.wikiSlug = page.slug;

    const attackTemplate = findAttackTemplateInvocation(page.content);
    if (!attackTemplate) {
      console.warn(`No attack data template found for ${item.wikiSlug}`);
      continue;
    }

    try {
      const expanded = await expandTemplate(attackTemplate, page.title);
      const properties = parseExpandedAttackTables(expanded);
      if (!Object.keys(properties).length) {
        console.warn(`No structured properties parsed for ${item.wikiSlug}`);
        continue;
      }

      item.properties = properties;
      if (item.hoverTexts) {
        delete item.hoverTexts;
      }
      console.log(`Processed ${item.displayName}`);
    } catch (error) {
      console.error(`Skipped ${item.displayName || item.wikiSlug}: ${error.message}`);
    }
  }

  await fs.writeFile(filePath, JSON.stringify(items, null, 2));
  console.log(`Saved updated ${name} → ${filePath}`);
}

async function main() {
  await processArray("primaries", "PRIMARIES");
  await processArray("secondaries", "SECONDARIES");
  await processArray("throwables", "THROWABLES");
  await processArray("stratagems", "STRATAGEMS");

  console.log("All data processed successfully");
}

main().catch((err) => {
  console.error("Fatal error:", err);
});
