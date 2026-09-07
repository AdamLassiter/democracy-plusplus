import type {
  AttackCapability,
  CoverageState,
  DemolitionSource,
  EnemyCoverageState,
  EnemyAnatomy,
  EnemyAnatomyPart,
  Item,
  PropertyValue,
  StructureTarget,
} from "../types";

const PENETRATION_VALUES: Record<string, number> = {
  unarmored: 0,
  "very light": 1,
  light: 2,
  medium: 3,
  heavy: 4,
  "anti-tank i": 5,
  "anti-tank 1": 5,
  "anti-tank ii": 6,
  "anti-tank 2": 6,
  "anti-tank iii": 7,
  "anti-tank 3": 7,
  "anti-tank iv": 8,
  "anti-tank 4": 8,
  "anti-tank v": 9,
  "anti-tank 5": 9,
  "anti-tank vi": 10,
  "anti-tank 6": 10,
};

export const ARMOR_LABELS: Record<number, string> = {
  0: "Unarmored",
  1: "Very Light",
  2: "Light",
  3: "Medium",
  4: "Heavy",
  5: "Anti-Tank 1",
  6: "Anti-Tank 2",
  7: "Anti-Tank 3",
  8: "Anti-Tank 4",
  9: "Anti-Tank 5",
  10: "Anti-Tank 6",
};

export function parsePenetration(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[–—]/g, "-");
  if (normalized in PENETRATION_VALUES) {
    return PENETRATION_VALUES[normalized];
  }
  const numeric = normalized.match(/^\d+$/);
  return numeric ? Number.parseInt(numeric[0], 10) : null;
}

function asRecord(value: PropertyValue | undefined): Record<string, PropertyValue> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, PropertyValue>
    : null;
}

function parseNumber(value: PropertyValue | undefined) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
}

function containsExplosion(value: PropertyValue): boolean {
  if (typeof value === "string") return /\bexplosion\b/i.test(value);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsExplosion);
}

export function extractItemCapabilities(item: Item, demolitionSource?: DemolitionSource): AttackCapability[] {
  const sourceByAttack = new Map(
    (demolitionSource?.attacks ?? []).map((attack) => [attack.name.toLowerCase(), attack]),
  );
  const capabilities: AttackCapability[] = [];

  for (const [attackName, rawAttack] of Object.entries(item.properties ?? {})) {
    const attack = asRecord(rawAttack);
    if (!attack) continue;
    const penetration = asRecord(attack.Penetration);
    const armorPenetration = parsePenetration(penetration?.Direct);
    let demolitionForce: number | null = null;
    for (const rawSection of Object.values(attack)) {
      const section = asRecord(rawSection);
      if (section && "Demolition Force" in section) {
        demolitionForce = Math.max(demolitionForce ?? 0, parseNumber(section["Demolition Force"]) ?? 0);
      }
    }

    const authoritative = sourceByAttack.get(attackName.toLowerCase())
      ?? [...sourceByAttack.values()].find((source) =>
        attackName.toLowerCase().includes(source.name.toLowerCase())
        || source.name.toLowerCase().includes(attackName.toLowerCase()),
      );
    if (armorPenetration === null && demolitionForce === null && !authoritative) continue;

    capabilities.push({
      itemName: item.displayName,
      attackName,
      armorPenetration,
      demolitionForce: authoritative?.demolitionForce ?? demolitionForce,
      explosive: authoritative?.explosive ?? (containsExplosion(rawAttack) || /\bie\b/i.test(attackName)),
    });
  }

  for (const source of demolitionSource?.attacks ?? []) {
    if (capabilities.some((capability) => capability.attackName.toLowerCase() === source.name.toLowerCase())) continue;
    capabilities.push({
      itemName: item.displayName,
      attackName: source.name,
      armorPenetration: null,
      demolitionForce: source.demolitionForce,
      explosive: source.explosive,
    });
  }
  return capabilities;
}

export function effectiveArmor(part: EnemyAnatomyPart, difficulty: number) {
  let armor = parsePenetration(part.armor) ?? 0;
  for (const [minimumDifficulty, value] of Object.entries(part.armorByDifficulty ?? {})
    .sort(([left], [right]) => Number(left) - Number(right))) {
    if (difficulty >= Number(minimumDifficulty)) armor = parsePenetration(value) ?? armor;
  }
  return armor;
}

export function coverageState(covered: number, total: number): CoverageState {
  if (total <= 0 || covered <= 0) return "none";
  return covered >= total ? "full" : "partial";
}

export function anatomyCoverage(anatomy: EnemyAnatomy, capabilities: AttackCapability[], difficulty: number) {
  const parts = anatomy.parts.map((part) => {
    const armor = effectiveArmor(part, difficulty);
    const matchingItems = [...new Set(capabilities
      .filter((capability) => capability.armorPenetration !== null && capability.armorPenetration >= armor)
      .map((capability) => capability.itemName))];
    return { part, armor, matchingItems, covered: matchingItems.length > 0 };
  });
  return { parts, state: coverageState(parts.filter((part) => part.covered).length, parts.length) };
}

export function enemyAnatomyCoverageState(
  anatomy: EnemyAnatomy,
  capabilities: AttackCapability[],
  difficulty: number,
): EnemyCoverageState {
  const maximumPenetration = Math.max(
    ...capabilities.flatMap((capability) => capability.armorPenetration === null ? [] : [capability.armorPenetration]),
    -1,
  );
  const comparisons = anatomy.parts.map((part) => maximumPenetration - effectiveArmor(part, difficulty));
  const beaten = comparisons.filter((comparison) => comparison > 0).length;
  const resisted = comparisons.filter((comparison) => comparison === 0).length;
  const total = comparisons.length;

  if (total === 0 || beaten + resisted === 0) return "none";
  if (beaten === total) return "full";
  if (beaten + resisted === total) return "fullResisted";
  if (resisted > 0) return "partialResisted";
  return "partial";
}

export function bestEnemyCoverage(states: EnemyCoverageState[]): EnemyCoverageState {
  const rank: Record<EnemyCoverageState, number> = {
    none: 0,
    partialResisted: 1,
    partial: 2,
    fullResisted: 3,
    full: 4,
  };
  return states.reduce<EnemyCoverageState>(
    (best, state) => rank[state] > rank[best] ? state : best,
    "none",
  );
}

export function structureCoverage(targets: StructureTarget[], capabilities: AttackCapability[]) {
  const evaluatedTargets = targets.map((target) => {
    const matchingItems = [...new Set(capabilities.filter((capability) =>
      capability.demolitionForce !== null
      && capability.demolitionForce >= target.demolitionForce
      && (!target.badr || capability.explosive),
    ).map((capability) => capability.itemName))];
    const sufficientNonExplosive = target.badr && capabilities.some((capability) =>
      capability.demolitionForce !== null
      && capability.demolitionForce >= target.demolitionForce
      && !capability.explosive,
    );
    return {
      target,
      matchingItems,
      covered: matchingItems.length > 0,
      failureReason: matchingItems.length
        ? null
        : sufficientNonExplosive
          ? "BaDR requires an explosive attack"
          : "Insufficient demolition force",
    };
  });
  return {
    targets: evaluatedTargets,
    state: coverageState(evaluatedTargets.filter((target) => target.covered).length, evaluatedTargets.length),
  };
}

export function bestCoverage(states: CoverageState[]): CoverageState {
  if (states.includes("full")) return "full";
  if (states.includes("partial")) return "partial";
  return "none";
}
