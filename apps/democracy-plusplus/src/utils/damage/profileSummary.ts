import type { Item } from "../../types";
import { simulateStratagemDeployment } from "./combatSimulator.ts";
import { usesBoundedExposure, type CombatSourceOption } from "./combatSourceCatalog.ts";
import { calculateWeaponDps } from "./simulator.ts";
import type { CombatSourceProfile, DpsValue } from "./types.ts";

export type DamageProfileSummary = {
  item: Item;
  profile: CombatSourceProfile | null;
  profileIndex: number;
  armorPenetration: number | null;
  damageTypes: string[];
  burstDps: DpsValue | null;
  sustainedDps: DpsValue | null;
  totalDamage: DpsValue | null;
  warnings: string[];
};

const ONE_PAYLOAD = {
  id: "summary-payload",
  label: "1 payload",
  payloadHits: 1,
  confidence: "sourced" as const,
};

function maximumArmorPenetration(profile: CombatSourceProfile) {
  const values = profile.components.flatMap((component) => [
    component.armorPenetration,
    ...(component.outer ? [component.outer.armorPenetration] : []),
  ]);
  return values.length ? Math.max(...values) : null;
}

function summarizeProfile(item: Item, profile: CombatSourceProfile, profileIndex: number): DamageProfileSummary {
  const calculation = calculateWeaponDps(profile);
  const deployment = profile.sourceKind === "stratagem" && usesBoundedExposure(profile)
    ? simulateStratagemDeployment(profile, ONE_PAYLOAD)
    : null;
  return {
    item,
    profile,
    profileIndex,
    armorPenetration: maximumArmorPenetration(profile),
    damageTypes: [...new Set([
      ...profile.components.map(({ damageType }) => damageType),
      ...profile.statuses.map(({ label }) => label),
    ])].sort(),
    burstDps: calculation.burstDps,
    sustainedDps: deployment
      ? deployment.timing.rearmAmortizedThroughput ?? deployment.timing.cooldownAmortizedThroughput
      : calculation.sustainedDps,
    totalDamage: deployment?.deployment.areaOutput
      ?? (profile.resource.infinite && !profile.heatState && profile.firingDurationSeconds === undefined
        ? null
        : calculation.magazineDamage),
    warnings: calculation.warnings,
  };
}

export function summarizeCombatSource(option: CombatSourceOption): DamageProfileSummary[] {
  if (!option.result.profiles.length) {
    return [{
      item: option.item,
      profile: null,
      profileIndex: -1,
      armorPenetration: null,
      damageTypes: [],
      burstDps: null,
      sustainedDps: null,
      totalDamage: null,
      warnings: option.result.unsupportedReasons,
    }];
  }
  return option.result.profiles.map((profile, profileIndex) =>
    summarizeProfile(option.item, profile, profileIndex));
}
