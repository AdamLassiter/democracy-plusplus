import type { Item } from "../../types";
import { ENEMY_EXPLOSION_SCENARIOS } from "./explosionScenarios.ts";
import { calculateWeaponDps } from "./simulator.ts";
import { extractStratagemProfiles } from "./stratagemProfiles.ts";
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

export type StratagemCoverageRow = {
  stratagem: string;
  profiles: string[];
  classification: "damaging" | "utility" | "unsupported";
  delivery: string[];
  direct: CoverageState;
  explosion: CoverageState;
  status: CoverageState;
  effect: CoverageState;
  triggerResourceTiming: CoverageState;
  payloadDamage: CoverageState;
  targetExposure: CoverageState;
  totalAreaOutput: CoverageState;
  deploymentTiming: CoverageState;
  targetTtk: CoverageState;
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

export function stratagemCoverageRow(item: Item): StratagemCoverageRow {
  const result = extractStratagemProfiles(item);
  const profiles = result.profiles;
  const damaging = profiles.length > 0;
  const deliveryKinds = [...new Set(profiles.map(({ delivery }) => delivery.kind))];
  const completeExposure = damaging && profiles.every(({ delivery }) =>
    delivery.exposureScenarios.length > 0
    && delivery.exposureScenarios.every(({ payloadHits, confidence }) => payloadHits > 0 && confidence !== "estimated"),
  );
  const completeAreaOutput = damaging && profiles.every(({ delivery, warnings }) =>
    delivery.totalPayloads > 0 && !warnings.some((warning) => /payload count is unavailable|area output is partial/i.test(warning)),
  );
  const completeTiming = item.stratagemSimulation?.callInSeconds !== undefined
    && (item.stratagemSimulation.cooldownSeconds !== undefined
      || item.stratagemSimulation.rearmSeconds !== undefined);
  const raw = rawPropertyText(item);
  const rawHasExplosion = raw.includes("explosion") || raw.includes("explode after") || raw.includes("explosion on impact");
  const rawHasStatus = raw.includes('"status"');
  const rawHasEffects = raw.includes("special effects") || raw.includes("aoe effect");
  const anyDirect = profiles.some((profile) => profile.components.some(({ kind }) => kind === "direct"));
  const anyExplosion = profiles.some((profile) => profile.components.some(({ kind }) => kind === "explosion"));
  const anyStatus = profiles.some((profile) => profile.statuses.length > 0);
  const anyEffect = profiles.some((profile) => profile.effects.length > 0);
  const completePayloadDamage = damaging && profiles.every(({ warnings }) =>
    !warnings.some((warning) => /first independently damage-bearing|linked explosion records could not|damage definition is incomplete/i.test(warning)),
  );
  const coverageReasons = [
    ...result.unsupportedReasons,
    ...profiles.flatMap(({ warnings }) => warnings),
    ...profiles.flatMap(({ delivery }) => delivery.exposureScenarios
      .filter(({ confidence }) => confidence === "estimated")
      .map(({ label }) => `Target exposure '${label}' is estimated.`)),
    ...(!completeTiming ? ["Base call-in plus cooldown/rearm timing is incomplete."] : []),
  ];
  return {
    stratagem: item.displayName,
    profiles: profiles.map(({ label }) => label),
    classification: damaging ? "damaging" : result.intentionallyNonDamaging ? "utility" : "unsupported",
    delivery: deliveryKinds,
    direct: !damaging ? "not-applicable" : anyDirect ? "complete" : "not-applicable",
    explosion: !rawHasExplosion ? "not-applicable" : anyExplosion ? "complete" : damaging ? "partial" : "not-applicable",
    status: !rawHasStatus ? "not-applicable" : anyStatus || anyEffect ? "complete" : damaging ? "partial" : "not-applicable",
    effect: !rawHasEffects ? "not-applicable" : anyEffect || anyStatus ? "complete" : damaging ? "partial" : "not-applicable",
    triggerResourceTiming: damaging && profiles.every(({ roundsPerMinute, resource, warnings }) =>
      roundsPerMinute > 0
      && resource.capacity > 0
      && !warnings.some((warning) => /sequencing placeholder|capacity is unavailable/i.test(warning)))
      ? "complete" : damaging ? "partial" : "not-applicable",
    payloadDamage: completePayloadDamage ? "complete" : damaging ? "partial" : result.intentionallyNonDamaging ? "not-applicable" : "unsupported",
    targetExposure: completeExposure ? "complete" : damaging ? "partial" : "not-applicable",
    totalAreaOutput: completeAreaOutput ? "complete" : damaging ? "partial" : "not-applicable",
    deploymentTiming: completeTiming ? "complete" : "partial",
    targetTtk: damaging ? completeExposure ? "complete" : "partial" : result.intentionallyNonDamaging ? "not-applicable" : "unsupported",
    reasons: [...new Set(coverageReasons)],
  };
}

export function buildStratagemCoverageReport(items: Item[]) {
  return [...items]
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .map(stratagemCoverageRow);
}

export function buildStratagemCoverageTotals(rows: StratagemCoverageRow[]) {
  const families = new Map<string, StratagemCoverageRow[]>();
  for (const row of rows) {
    const family = row.delivery[0] ?? (row.classification === "utility" ? "utility" : "unclassified");
    families.set(family, [...(families.get(family) ?? []), row]);
  }
  return [...families.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([family, familyRows]) => ({
      family,
      total: familyRows.length,
      damaging: familyRows.filter(({ classification }) => classification === "damaging").length,
      utility: familyRows.filter(({ classification }) => classification === "utility").length,
      unsupported: familyRows.filter(({ classification }) => classification === "unsupported").length,
      completeTargetExposure: familyRows.filter(({ targetExposure }) => targetExposure === "complete").length,
      partialTargetExposure: familyRows.filter(({ targetExposure }) => targetExposure === "partial").length,
    }));
}
