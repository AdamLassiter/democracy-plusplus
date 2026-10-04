import fs from "node:fs/promises";

import type { Item } from "../src/types.ts";
import { buildWeaponCoverageReport } from "../src/utils/damage/coverage.ts";

async function readItems(fileName: string) {
  return JSON.parse(await fs.readFile(`./public/data/${fileName}.json`, "utf8")) as Item[];
}

const weapons = [
  ...await readItems("primaries"),
  ...await readItems("secondaries"),
];
const report = buildWeaponCoverageReport(weapons);
await fs.writeFile(
  "./public/data/damage-simulation-coverage.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(`Wrote ${report.length} weapon coverage rows.`);
