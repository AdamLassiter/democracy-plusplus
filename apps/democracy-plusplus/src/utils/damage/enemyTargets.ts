import type { Enemy, EnemyAnatomy, EnemyAnatomyPart } from "../../types";
import { effectiveArmor } from "../capabilities.ts";
import type { EnemyTargetResult } from "./types.ts";

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

function effectiveHealth(part: EnemyAnatomyPart, difficulty: number) {
  let health = parseNumber(part.health);
  for (const [minimumDifficulty, value] of Object.entries(part.healthByDifficulty ?? {})
    .sort(([left], [right]) => Number(left) - Number(right))) {
    if (difficulty >= Number(minimumDifficulty)) health = value;
  }
  return health;
}

export function normalizeEnemyTarget(
  enemy: Enemy,
  anatomy: EnemyAnatomy,
  part: EnemyAnatomyPart,
  difficulty: number,
): EnemyTargetResult {
  const unsupportedReasons: string[] = [];
  const localMainParts = anatomy.parts.filter((candidate) => candidate.name.trim().toLowerCase() === "main");
  const sharedMainParts = enemy.anatomy
    .flatMap((candidate) => candidate.parts)
    .filter((candidate) => candidate.name.trim().toLowerCase() === "main");
  const mainParts = localMainParts.length ? localMainParts : sharedMainParts;
  const mainPart = mainParts.length === 1 ? mainParts[0] : undefined;
  if (!mainPart) {
    unsupportedReasons.push(`The target must resolve exactly one Main row; found ${mainParts.length}.`);
  }
  const mainHealth = mainPart ? effectiveHealth(mainPart, difficulty) : null;
  if (mainPart && (mainHealth === null || mainHealth <= 0)) {
    unsupportedReasons.push("Main health is not a positive numeric value.");
  }

  const durability = parsePercentage(part.durability);
  if (durability === null || durability < 0 || durability > 1) {
    unsupportedReasons.push("The selected part has no usable durability percentage.");
  }
  const isMainRow = part === mainPart;
  const hitsMainDirectly = isMainRow || /^main$/i.test(part.health.trim());
  const partHealth = hitsMainDirectly ? null : effectiveHealth(part, difficulty);
  if (!hitsMainDirectly && (partHealth === null || partHealth <= 0)) {
    unsupportedReasons.push("The selected part has no positive numeric health value.");
  }
  if (part.explosionResistance === undefined) {
    unsupportedReasons.push("The selected part has no explosion-resistance value.");
  }
  if (mainPart?.bleedDescription && mainPart.bleed === undefined) {
    unsupportedReasons.push(`Main constitution '${mainPart.bleedDescription}' could not be normalized.`);
  }
  if (part.bleedDescription && part.bleed === undefined) {
    unsupportedReasons.push(`Part constitution '${part.bleedDescription}' could not be normalized.`);
  }

  if (unsupportedReasons.length || !mainPart || mainHealth === null || durability === null) {
    return { target: null, unsupportedReasons };
  }

  return {
    target: {
      enemyName: enemy.displayName,
      anatomyName: anatomy.name,
      partName: part.name,
      difficulty,
      armorValue: effectiveArmor(part, difficulty),
      durability,
      explosionResistance: part.explosionResistance ?? 0,
      mainHealth,
      partHealth,
      damageToMain: isMainRow ? 1 : part.percentToMain ?? 0,
      damageToMainCapped: part.damageToMainCapped ?? false,
      fatal: part.fatal ?? false,
      mainConstitution: mainPart.bleed
        ? { health: mainPart.bleed.constitution, decayPerSecond: mainPart.bleed.decayPerSecond }
        : null,
      partConstitution: part !== mainPart && part.bleed
        ? { health: part.bleed.constitution, decayPerSecond: part.bleed.decayPerSecond }
        : null,
    },
    unsupportedReasons: [],
  };
}
