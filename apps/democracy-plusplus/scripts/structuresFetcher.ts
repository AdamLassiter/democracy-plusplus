import fs from "fs/promises";
import { fetchStructures } from "./wikiApi.ts";
import { banner, createTask, errorMessage, note, summary } from "./terminalUi.ts";

async function main() {
  banner("Structures Fetcher", "Demolition thresholds, BaDR, sources, and structure details");
  const task = createTask("Fetching structures", "Demolition and linked structure pages");
  const structures = await fetchStructures();
  task.succeed(`${structures.structures.length} structures`);
  await fs.writeFile("./public/data/structures.json", JSON.stringify(structures, null, 2));
  summary("Structures summary", {
    structures: structures.structures.length,
    targets: structures.structures.reduce((total, structure) => total + structure.targets.length, 0),
    demolitionSources: structures.demolitionSources.length,
  });
}

main().catch((error: unknown) => {
  note(`Fatal error: ${errorMessage(error)}`, "error");
  process.exitCode = 1;
});
