import type { Enemy, EnemyAnatomy, EnemyAnatomyPart } from "../../types";
import { effectiveArmor } from "../capabilities.ts";
import { explosionScenariosFor } from "./explosionScenarios.ts";
import type { EnemyTargetPart, EnemyTargetResult } from "./types.ts";

export function simulationId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function enemyPartCount(part: EnemyAnatomyPart) {
  if (part.count !== undefined) return part.count;
  const match = part.name.match(/\((\d+)\)\s*$/);
  return match ? Number(match[1]) : 1;
}

function parseNumber(value: string) {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: string) {
  const amount = parseNumber(value);
  return amount === null || !value.includes("%") ? null : amount / 100;
}

export function effectiveEnemyHealth(
  part: EnemyAnatomyPart,
  difficulty: number,
) {
  let health = parseNumber(part.health);
  for (const [minimumDifficulty, value] of Object.entries(
    part.healthByDifficulty ?? {},
  ).sort(([left], [right]) => Number(left) - Number(right))) {
    if (difficulty >= Number(minimumDifficulty)) health = value;
  }
  return health;
}

export type EnemyDifficultyRange = {
  minimum: number;
  maximum: number;
};

export function enemyDifficultyRanges(
  enemy: Enemy,
  minimum = 1,
  maximum = 10,
): EnemyDifficultyRange[] {
  const breakpoints = enemy.anatomy
    .flatMap((anatomy) => anatomy.parts)
    .flatMap((part) => [
      ...Object.keys(part.armorByDifficulty ?? {}),
      ...Object.keys(part.healthByDifficulty ?? {}),
    ])
    .map(Number)
    .filter(
      (difficulty) =>
        Number.isInteger(difficulty) &&
        difficulty > minimum &&
        difficulty <= maximum,
    );
  const starts = [minimum, ...new Set(breakpoints)].sort(
    (left, right) => left - right,
  );

  return starts.map((rangeMinimum, index) => ({
    minimum: rangeMinimum,
    maximum: (starts[index + 1] ?? maximum + 1) - 1,
  }));
}

export function normalizeEnemyTarget(
  enemy: Enemy,
  anatomy: EnemyAnatomy,
  part: EnemyAnatomyPart,
  difficulty: number,
): EnemyTargetResult {
  const unsupportedReasons: string[] = [];
  const localMainParts = anatomy.parts.filter(
    (candidate) => candidate.name.trim().toLowerCase() === "main",
  );
  const sharedMainParts = enemy.anatomy
    .flatMap((candidate) => candidate.parts)
    .filter((candidate) => candidate.name.trim().toLowerCase() === "main");
  const mainParts = localMainParts.length ? localMainParts : sharedMainParts;
  const mainPart = mainParts.length === 1 ? mainParts[0] : undefined;
  if (!mainPart) {
    unsupportedReasons.push(
      `The target must resolve exactly one Main row; found ${mainParts.length}.`,
    );
  }
  const mainHealth = mainPart
    ? effectiveEnemyHealth(mainPart, difficulty)
    : null;
  if (mainPart && (mainHealth === null || mainHealth <= 0)) {
    unsupportedReasons.push("Main health is not a positive numeric value.");
  }

  const durability = parsePercentage(part.durability);
  if (durability === null || durability < 0 || durability > 1) {
    unsupportedReasons.push(
      "The selected part has no usable durability percentage.",
    );
  }
  const isMainRow = part === mainPart;
  const hitsMainDirectly = isMainRow || /^main$/i.test(part.health.trim());
  const partHealth = hitsMainDirectly
    ? null
    : effectiveEnemyHealth(part, difficulty);
  if (!hitsMainDirectly && (partHealth === null || partHealth <= 0)) {
    unsupportedReasons.push(
      "The selected part has no positive numeric health value.",
    );
  }
  if (part.explosionResistance === undefined) {
    unsupportedReasons.push(
      "The selected part has no explosion-resistance value.",
    );
  }
  if (mainPart?.bleedDescription && mainPart.bleed === undefined) {
    unsupportedReasons.push(
      `Main constitution '${mainPart.bleedDescription}' could not be normalized.`,
    );
  }
  if (part.bleedDescription && part.bleed === undefined) {
    unsupportedReasons.push(
      `Part constitution '${part.bleedDescription}' could not be normalized.`,
    );
  }

  if (
    unsupportedReasons.length ||
    !mainPart ||
    mainHealth === null ||
    durability === null
  ) {
    return { target: null, unsupportedReasons };
  }

  const normalizedParts = anatomy.parts.flatMap<EnemyTargetPart>(
    (candidate) => {
      const candidateDurability = parsePercentage(candidate.durability);
      const candidateIsMain = candidate === mainPart;
      const candidateHitsMain =
        candidateIsMain || /^main$/i.test(candidate.health.trim());
      const candidateHealth = candidateHitsMain
        ? null
        : effectiveEnemyHealth(candidate, difficulty);
      if (
        candidateDurability === null ||
        candidate.explosionResistance === undefined
      )
        return [];
      if (
        !candidateHitsMain &&
        (candidateHealth === null || candidateHealth <= 0)
      )
        return [];
      return [
        {
          id: candidate.id ?? simulationId(candidate.name),
          name: candidate.name,
          count: enemyPartCount(candidate),
          armorValue: effectiveArmor(candidate, difficulty),
          durability: candidateDurability,
          explosionResistance: candidate.explosionResistance,
          partHealth: candidateHealth,
          damageToMain: candidateIsMain ? 1 : (candidate.percentToMain ?? 0),
          damageToMainCapped: candidate.damageToMainCapped ?? false,
          fatal: candidate.fatal ?? false,
          constitution:
            !candidateIsMain && candidate.bleed
              ? {
                  health: candidate.bleed.constitution,
                  decayPerSecond: candidate.bleed.decayPerSecond,
                }
              : null,
          explosionVerificationMode: candidate.explosionVerificationMode,
        },
      ];
    },
  );
  const enemyId = simulationId(enemy.wikiSlug || enemy.displayName);
  const anatomyId = simulationId(anatomy.name);
  const aimedPartId = part.id ?? simulationId(part.name);

  return {
    target: {
      enemyId,
      enemyName: enemy.displayName,
      anatomyId,
      anatomyName: anatomy.name,
      aimedPartId,
      partName: part.name,
      difficulty,
      armorValue: effectiveArmor(part, difficulty),
      durability,
      explosionResistance: part.explosionResistance ?? 0,
      mainHealth,
      mainArmorValue: effectiveArmor(mainPart, difficulty),
      partHealth,
      damageToMain: isMainRow ? 1 : (part.percentToMain ?? 0),
      damageToMainCapped: part.damageToMainCapped ?? false,
      fatal: part.fatal ?? false,
      mainConstitution: mainPart.bleed
        ? {
            health: mainPart.bleed.constitution,
            decayPerSecond: mainPart.bleed.decayPerSecond,
          }
        : null,
      partConstitution:
        part !== mainPart && part.bleed
          ? {
              health: part.bleed.constitution,
              decayPerSecond: part.bleed.decayPerSecond,
            }
          : null,
      parts: normalizedParts,
      explosionScenarios: explosionScenariosFor(enemyId, anatomyId),
      elementalMultipliers: enemy.elementalMultipliers ?? {},
      statusThresholds: enemy.statusThresholds ?? {},
    },
    unsupportedReasons: [],
  };
}
