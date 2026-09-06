import fs from "fs/promises";

import { fetchBestiary } from "./wikiApi.ts";
import { banner, createTask, errorMessage, note, summary } from "./terminalUi.ts";

async function main() {
  banner("Bestiary Fetcher", "Faction rosters, variants, and anatomy armor values");
  const fetchTask = createTask("Fetching bestiary", "Factions and enemy pages");
  const bestiary = await fetchBestiary();
  fetchTask.succeed(`${bestiary.enemies.length} enemies`);

  const filePath = "./public/data/enemies.json";
  const saveTask = createTask("Saving BESTIARY", filePath);
  await fs.writeFile(filePath, JSON.stringify(bestiary, null, 2));
  saveTask.succeed("written");
  summary("Bestiary summary", {
    enemies: bestiary.enemies.length,
    withAnatomy: bestiary.enemies.filter((enemy) => enemy.anatomy.length > 0).length,
    withVariants: bestiary.enemies.filter((enemy) => enemy.variants.length > 0).length,
  });
}

main().catch((error: unknown) => {
  note(`Fatal error: ${errorMessage(error)}`, "error");
  process.exitCode = 1;
});
