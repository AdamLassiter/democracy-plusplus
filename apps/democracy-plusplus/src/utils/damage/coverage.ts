import type { Item } from "../../types";
import { ENEMY_EXPLOSION_SCENARIOS } from "./explosionScenarios.ts";
import { calculateWeaponDps } from "./simulator.ts";
import { extractWeaponProfiles } from "./weaponProfiles.ts";

export type CoverageState = "complete" | "partial" | "unsupported" | "not-applicable";

export type WeaponCoverageRow = {
  weapon: string;
  profiles: string[];
  direct: CoverageState;
  explosion: CoverageState;
  status: CoverageState;
  timing: CoverageState;
  targetTtk: CoverageState;
  explosionTargeting: "not-applicable" | "selected-part-only" | "multi-part-scenario";
  reasons: string[];
};

function rawPropertyText(item: Item) {
  return JSON.stringify(item.properties ?? {}).toLowerCase();
}

export function weaponCoverageRow(item: Item): WeaponCoverageRow {
  const result = extractWeaponProfiles(item);
  const profiles = result.profiles;
  const raw = rawPropertyText(item);
  const rawHasExplosion = raw.includes("explosion") || raw.includes("explode after") || raw.includes("explosion on impact");
  const rawHasStatus = raw.includes('"status"');
  const profilesWithDirect = profiles.filter((profile) => profile.components.some(({ kind }) => kind === "direct"));
  const profilesWithExplosion = profiles.filter((profile) => profile.components.some(({ kind }) => kind === "explosion"));
  const profilesWithStatus = profiles.filter((profile) => profile.statuses.length > 0);
  const profilesWithEffects = profiles.filter((profile) => profile.effects.length > 0);
  const profilesWithCompleteTiming = profiles.filter((profile) => calculateWeaponDps(profile).sustainedDps !== null);
  const reasons = [...new Set([
    ...result.unsupportedReasons,
    ...profiles.flatMap(({ warnings }) => warnings),
  ])];
  const statusCoverage: CoverageState = !rawHasStatus
    ? "not-applicable"
    : profiles.length === 0
      ? "unsupported"
      : profilesWithStatus.length > 0 || profilesWithEffects.length > 0 ? "complete" : "partial";

  return {
    weapon: item.displayName,
    profiles: profiles.map(({ label }) => label),
    direct: profiles.length === 0
      ? "unsupported"
      : profilesWithDirect.length === profiles.length ? "complete" : "partial",
    explosion: !rawHasExplosion
      ? "not-applicable"
      : profiles.length === 0
        ? "unsupported"
        : profilesWithExplosion.length > 0 ? "complete" : "partial",
    status: statusCoverage,
    timing: profiles.length === 0
      ? "unsupported"
      : profilesWithCompleteTiming.length === profiles.length ? "complete" : "partial",
    targetTtk: profiles.length === 0
      ? "unsupported"
      : statusCoverage === "partial" ? "partial" : "complete",
    explosionTargeting: profilesWithExplosion.length === 0
      ? "not-applicable"
      : ENEMY_EXPLOSION_SCENARIOS.length > 0 ? "multi-part-scenario" : "selected-part-only",
    reasons,
  };
}

export function buildWeaponCoverageReport(items: Item[]) {
  return [...items]
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .map(weaponCoverageRow);
}
