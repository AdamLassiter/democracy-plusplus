import fs from "node:fs/promises";

import type { Item } from "../src/types.ts";
import {
  buildStratagemCoverageReport,
  buildStratagemCoverageTotals,
  buildWeaponCoverageReport,
} from "../src/utils/damage/coverage.ts";

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

const stratagems = await readItems("stratagems");
const stratagemReport = buildStratagemCoverageReport(stratagems);
await fs.writeFile(
  "./public/data/stratagem-damage-simulation-coverage.json",
  `${JSON.stringify(stratagemReport, null, 2)}\n`,
);
console.log(`Wrote ${stratagemReport.length} stratagem coverage rows.`);
const stratagemTotals = buildStratagemCoverageTotals(stratagemReport);
await fs.writeFile(
  "./public/data/stratagem-damage-simulation-family-totals.json",
  `${JSON.stringify(stratagemTotals, null, 2)}\n`,
);
console.log(`Wrote ${stratagemTotals.length} stratagem family totals.`);
