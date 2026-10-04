import type { Enemy } from "../../types.ts";
import type { EnemyExplosionScenario } from "./types.ts";

function scenarioId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Spatial overlap cannot be inferred from the anatomy table. Keep reviewed
 * scenarios here so their assumptions and provenance remain visible and
 * independently auditable.
 */
export const ENEMY_EXPLOSION_SCENARIOS: EnemyExplosionScenario[] = [
  {
    id: "dragonroach:standard:centre-mass",
    enemyId: "dragonroach",
    anatomyId: "standard",
    label: "Centre mass (curated)",
    directHitPartId: "abdomen-armor",
    affectedParts: [
      { partId: "carapace", instances: 2, radius: "inner", lineOfSight: true },
      { partId: "wings", instances: 4, radius: "inner", lineOfSight: true },
      {
        partId: "thorax-sac",
        instances: 1,
        radius: "inner",
        lineOfSight: true,
      },
      {
        partId: "abdomen-sac",
        instances: 1,
        radius: "inner",
        lineOfSight: true,
      },
      {
        partId: "abdomen-armor",
        instances: 1,
        radius: "inner",
        lineOfSight: true,
      },
    ],
    sourceUrl: "https://helldivers.wiki.gg/wiki/Dragonroach",
    sourceVersion: "1.006.202",
    confidence: "curated",
    note: "The wiki verifies that a GP-20 body shot is lethal because its blast reaches many body parts; the exact overlap map is a reviewed reproduction fixture, not decoded geometry.",
  },
];

export function explosionScenariosFor(enemyId: string, anatomyId: string) {
  return ENEMY_EXPLOSION_SCENARIOS.filter(
    (scenario) =>
      scenario.enemyId === enemyId && scenario.anatomyId === anatomyId,
  );
}

export function validateExplosionScenarios(enemies: Enemy[]) {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const scenario of ENEMY_EXPLOSION_SCENARIOS) {
    if (ids.has(scenario.id))
      problems.push(`Duplicate explosion scenario ID '${scenario.id}'.`);
    ids.add(scenario.id);
    const enemy = enemies.find(
      (candidate) =>
        scenarioId(candidate.wikiSlug || candidate.displayName) ===
        scenario.enemyId,
    );
    const anatomy = enemy?.anatomy.find(
      (candidate) => scenarioId(candidate.name) === scenario.anatomyId,
    );
    if (!enemy || !anatomy) {
      problems.push(
        `Scenario '${scenario.id}' references a missing enemy anatomy.`,
      );
      continue;
    }
    const parts = new Map(
      anatomy.parts.map((part) => [
        part.id ?? scenarioId(part.name),
        part.count ?? Number(part.name.match(/\((\d+)\)\s*$/)?.[1] ?? 1),
      ]),
    );
    if (scenario.directHitPartId && !parts.has(scenario.directHitPartId)) {
      problems.push(
        `Scenario '${scenario.id}' references missing direct-hit part '${scenario.directHitPartId}'.`,
      );
    }
    const affectedIds = new Set<string>();
    for (const affected of scenario.affectedParts) {
      const key = `${affected.partId}:${affected.radius}`;
      if (affectedIds.has(key))
        problems.push(
          `Scenario '${scenario.id}' repeats affected part '${key}'.`,
        );
      affectedIds.add(key);
      const count = parts.get(affected.partId);
      if (count === undefined)
        problems.push(
          `Scenario '${scenario.id}' references missing part '${affected.partId}'.`,
        );
      if (
        !Number.isInteger(affected.instances) ||
        affected.instances <= 0 ||
        (count !== undefined && affected.instances > count)
      ) {
        problems.push(
          `Scenario '${scenario.id}' has an invalid instance count for '${affected.partId}'.`,
        );
      }
      if (
        affected.radius === "outer" &&
        (affected.damageFraction === undefined ||
          affected.damageFraction < 0 ||
          affected.damageFraction > 1)
      ) {
        problems.push(
          `Scenario '${scenario.id}' needs an outer-radius damage fraction in 0..1.`,
        );
      }
    }
  }
  return problems;
}
