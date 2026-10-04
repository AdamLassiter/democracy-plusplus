import type { Item, PropertyValue } from "../../types";
import { asPropertyRecord, parseCount, parseFirstNumber } from "./parse.ts";
import { parsePenetration } from "../capabilities.ts";
import type {
  CombatSourceDelivery,
  CombatSourceKind,
  CombatSourceProfile,
  CombatSourceProfileResult,
  DamageComponent,
  TargetExposureScenario,
  WeaponProfile,
} from "./types.ts";
import {
  canonicalAttackName,
  configureProjectileExplosion,
  extractDirectComponent,
  extractExplosionComponent,
  extractNonDamageEffects,
  extractStatusApplication,
  findLinkedPropertyGroup,
  findPropertyGroup,
  normalizedAttackName,
  extractWeaponProfiles,
} from "./weaponProfiles.ts";
import { REVIEWED_STRATAGEM_DELIVERY } from "./stratagemDeliveryConfigurations.ts";

type PayloadSource = {
  id: string;
  label: string;
  base: Record<string, PropertyValue>;
  attacks: Record<string, PropertyValue>;
};

const FOCUSED_STRIKES = new Set([
  "eagle110mmrocketpods",
  "eagle500kgbomb",
  "orbitalprecisionstrike",
  "orbitalrailcannonstrike",
]);

const PERSISTENT_AREAS = new Set([
  "orbitallaser",
  "orbitalgasstrike",
  "orbitalnapalmbarrage",
  "eaglenapalmairstrike",
  "eaglegasairstrike",
]);

const REVIEWED_EXPOSURES: Record<string, TargetExposureScenario[]> = {
  eagle110mmrocketpods: [{
    id: "full-salvo",
    label: "All 6 rockets",
    payloadHits: 6,
    confidence: "sourced",
    note: "The strike fires three volleys of two rockets at one target.",
  }],
  eagle500kgbomb: [{
    id: "direct-bomb",
    label: "Bomb impact",
    payloadHits: 1,
    confidence: "sourced",
    note: "One bomb can apply its impact, impact explosion, and main explosion to the selected target.",
  }],
  orbitalprecisionstrike: [{ id: "direct-shell", label: "Direct shell", payloadHits: 1, confidence: "sourced" }],
  orbitalrailcannonstrike: [{ id: "targeted-shell", label: "Targeted shell", payloadHits: 1, confidence: "sourced" }],
  orbital380mmhebarrage: [
    { id: "one-shell", label: "1 shell", payloadHits: 1, confidence: "verified" },
    { id: "two-shells", label: "2 shells", payloadHits: 2, confidence: "estimated", note: "A generous repeated-hit case; the barrage disperses 15 shells over a wide area." },
  ],
  bmdc4pack: [
    { id: "one-charge", label: "1 charge", payloadHits: 1, confidence: "sourced" },
    { id: "all-charges", label: "All 7 charges", payloadHits: 7, confidence: "sourced" },
  ],
  orbitallaser: [{
    id: "full-focus",
    label: "Full 25 s focus",
    payloadHits: 25,
    confidence: "verified",
    note: "Upper-bound case where the laser spends its full active duration on one target.",
  }],
};

function identity(item: Item) {
  return item.internalName ?? canonicalAttackName(item.displayName);
}

function starDepth(name: string) {
  return name.match(/^\*+/)?.[0].length ?? 0;
}

function attackNames(attacks: Record<string, PropertyValue>) {
  const names = Object.keys(attacks);
  const minimumDepth = Math.min(...names.map(starDepth).filter((depth) => depth > 0));
  if (Number.isFinite(minimumDepth)) {
    return names.filter((name) => starDepth(name) === minimumDepth).map(normalizedAttackName);
  }
  return names;
}

function inlineAttacks(section: Record<string, PropertyValue>) {
  return Object.fromEntries(Object.entries(section).filter(([name]) => /^\*/.test(name)));
}

function collectPayloadSources(item: Item): PayloadSource[] {
  const sources: PayloadSource[] = [];
  for (const [rootName, rawRoot] of Object.entries(item.properties ?? {})) {
    const root = asPropertyRecord(rawRoot);
    if (!root) continue;
    const base = asPropertyRecord(root.Base);
    const attacks = asPropertyRecord(root.Attacks);
    if (base && attacks && attackNames(attacks).length) {
      sources.push({ id: canonicalAttackName(rootName), label: "Primary payload", base, attacks });
    }
    if (!base) continue;
    const baseInline = inlineAttacks(base);
    const siblingStats = Object.values(root)
      .map(asPropertyRecord)
      .find((section) => section && section !== base && parseFirstNumber(section["Fire Rate"]) !== null);
    if (Object.keys(baseInline).length) {
      sources.push({
        id: `${canonicalAttackName(rootName)}-base`,
        label: rootName,
        base: { ...base, ...(siblingStats ?? {}) },
        attacks: baseInline,
      });
    }
    for (const [sectionName, rawSection] of Object.entries(root)) {
      if (sectionName === "Base" || sectionName === "Attacks") continue;
      const section = asPropertyRecord(rawSection);
      if (!section) continue;
      const sectionAttacks = inlineAttacks(section);
      if (!Object.keys(sectionAttacks).length) continue;
      sources.push({
        id: canonicalAttackName(sectionName),
        label: sectionName,
        base: { ...base, ...section },
        attacks: sectionAttacks,
      });
    }
  }

  if (!sources.length) {
    for (const [name, rawGroup] of Object.entries(item.properties ?? {})) {
      const group = asPropertyRecord(rawGroup);
      if (!group || (!asPropertyRecord(group.Damage) && !asPropertyRecord(group.Penetration))) continue;
      sources.push({ id: canonicalAttackName(name), label: name, base: {}, attacks: { [name]: "Explosion" } });
      break;
    }
  }
  return sources;
}

function totalPayloads(item: Item, source?: PayloadSource) {
  const base = source?.base ?? {};
  const bombs = parseCount(base.Bombs) ?? 1;
  const salvos = parseCount(base.Salvos) ?? 1;
  const capacity = parseCount(base.Capacity);
  const id = identity(item);
  const reviewed = REVIEWED_STRATAGEM_DELIVERY[id];
  if (reviewed?.totalPayloads !== undefined) return reviewed.totalPayloads;
  if (id === "eagle110mmrocketpods") return 6;
  if (id === "orbitallaser") return 25;
  if (/mine/i.test(item.displayName)) return salvos * (capacity ?? 1);
  if (bombs > 1 || salvos > 1) return bombs * salvos;
  return capacity ?? 1;
}

function sourceKind(item: Item): CombatSourceKind {
  const id = identity(item);
  if (item.category === "Eagle" || item.category === "Orbital") {
    if (FOCUSED_STRIKES.has(id)) return "focused-strike";
    if (PERSISTENT_AREAS.has(id)) return "persistent-area";
    return "distributed-strike";
  }
  if (/mine|c4|hellbomb/i.test(`${item.displayName} ${id}`)) return "trap";
  if (item.tags?.includes("Vehicles")) return "mounted-weapon";
  if (item.tags?.includes("Sentry") || /guard dog|rover|hot dog|dog breath|k-9/i.test(item.displayName)) {
    return "autonomous-weapon";
  }
  if (item.tags?.includes("Emplacement")) return "mounted-weapon";
  return "support-weapon";
}

function replenishment(item: Item, kind: CombatSourceKind): CombatSourceDelivery["replenishment"] {
  if (item.stratagemSimulation?.rearmSeconds !== undefined) return "rearm";
  if (kind === "support-weapon") return "resupply";
  if (kind === "trap") return "cooldown";
  if (item.stratagemSimulation?.cooldownSeconds !== undefined) return "cooldown";
  return "persistent";
}

function defaultExposure(kind: CombatSourceKind, payloads: number): TargetExposureScenario[] {
  if (kind === "distributed-strike") {
    return [{
      id: "one-payload",
      label: "1 payload",
      payloadHits: 1,
      confidence: "estimated",
      note: `Selected-target damage is one of ${payloads} area payloads; total area output is reported separately.`,
    }];
  }
  if (kind === "trap") {
    return [{ id: "one-trigger", label: "1 triggered payload", payloadHits: 1, confidence: "verified" }];
  }
  if (kind === "support-weapon" || kind === "mounted-weapon" || kind === "autonomous-weapon") {
    return [{ id: "weapon-fire", label: "Weapon fire", payloadHits: 1, confidence: "sourced" }];
  }
  if (kind === "persistent-area") {
    return [{
      id: "one-payload",
      label: "1 payload exposure",
      payloadHits: 1,
      confidence: "estimated",
      note: "Ground-effect duration and repeated contact are not yet source-normalized for this deployment.",
    }];
  }
  return [{ id: "full-source", label: payloads === 1 ? "1 payload" : `All ${payloads} payloads`, payloadHits: payloads, confidence: "verified" }];
}

function maximumAreaDuration(item: Item) {
  const durations = Object.values(item.properties ?? {}).flatMap((rawGroup) => {
    const group = asPropertyRecord(rawGroup);
    const area = asPropertyRecord(group?.["Area of Effect"]);
    const duration = parseFirstNumber(area?.["AoE Duration"]);
    return duration !== null && duration > 0 ? [duration] : [];
  });
  return durations.length ? Math.max(...durations) : null;
}

function delivery(item: Item, source?: PayloadSource): CombatSourceDelivery {
  const kind = sourceKind(item);
  const payloads = totalPayloads(item, source);
  const id = identity(item);
  const reviewed = REVIEWED_STRATAGEM_DELIVERY[id];
  const duration = parseFirstNumber(source?.base.Duration)
    ?? (kind === "autonomous-weapon" ? parseFirstNumber(source?.base.Lifetime) : null)
    ?? (kind === "persistent-area" ? maximumAreaDuration(item) : null);
  return {
    kind,
    control: kind === "support-weapon" || kind === "mounted-weapon"
      ? "player"
      : kind === "autonomous-weapon"
        ? "autonomous"
        : kind === "trap"
          ? "proximity"
          : "scripted-pattern",
    totalPayloads: payloads,
    activationDelaySeconds: item.stratagemSimulation?.callInSeconds,
    activeDurationSeconds: duration ?? (id === "orbitallaser" ? 25 : undefined),
    cooldownSeconds: item.stratagemSimulation?.cooldownSeconds,
    rearmSeconds: item.stratagemSimulation?.rearmSeconds,
    uses: item.stratagemSimulation?.uses,
    exposureScenarios: reviewed?.targetExposureUnsupported
      ? []
      : REVIEWED_EXPOSURES[id] ?? defaultExposure(kind, payloads),
    replenishment: replenishment(item, kind),
    assumptions: kind === "distributed-strike"
      ? ["Selected-target exposure is not the deployment's total area damage."]
      : kind === "trap"
        ? ["One mine or placed charge is triggered by the selected target unless another exposure is selected."]
        : kind === "autonomous-weapon"
          ? ["Full-focus output assumes immediate acquisition, unobstructed tracking, and no retargeting."]
        : [...(reviewed?.note ? [reviewed.note] : [])],
  };
}

function attackWithAreaEffects(attack: Record<string, PropertyValue>) {
  return asPropertyRecord(attack["Special Effects"])
    ? attack
    : { ...attack, "Special Effects": attack["AoE Effect"] };
}

function componentsForAttack(item: Item, attackName: string) {
  const attack = findPropertyGroup(item, attackName);
  if (!attack) return null;
  const projectile = asPropertyRecord(attack.Projectile);
  const direct = extractDirectComponent(attackName, attack);
  let ownExplosion = extractExplosionComponent(attackName, attack);
  if (!ownExplosion) {
    const damage = asPropertyRecord(attack.Damage);
    const penetration = asPropertyRecord(attack.Penetration);
    const standard = parseFirstNumber(damage?.["Inner Radius"]);
    const durable = parseFirstNumber(damage?.["Inner Durable"]);
    const armorPenetration = parsePenetration(penetration?.Direct);
    if (standard !== null && durable !== null && armorPenetration !== null) {
      ownExplosion = {
        id: attackName,
        kind: "explosion",
        standardDamage: standard,
        durableDamage: durable,
        armorPenetration,
        damageType: "Explosion",
        packetsPerProjectile: 1,
        radius: "inner",
      };
    }
  }
  const linkedNames = [projectile?.["Explosion On Impact"], projectile?.["Explode After"]]
    .filter((name): name is string => typeof name === "string");
  const uniqueLinkedNames = [...new Set(linkedNames)];
  const linkedGroups = uniqueLinkedNames.flatMap((linkedName) => {
    const linked = findLinkedPropertyGroup(item, linkedName);
    return linked?.group ? [{ name: linked.name, group: linked.group }] : [];
  });
  const linkedExplosions = linkedGroups.flatMap((linked) => {
    const component = linked?.group
      ? configureProjectileExplosion(item, projectile, extractExplosionComponent(linked.name, linked.group))
      : null;
    if (!component) return [];
    return [{
      ...component,
      ...(identity(item) === "eagle500kgbomb" && canonicalAttackName(linked.name).endsWith("pe")
        ? { offsetSeconds: 0.8 }
        : {}),
    }];
  });
  const components: DamageComponent[] = [...(direct ? [direct] : []), ...(ownExplosion ? [ownExplosion] : []), ...linkedExplosions];
  if (identity(item) === "b100portablehellbomb") {
    for (const component of components) component.offsetSeconds = 10;
  }
  if (!components.some((component) => component.standardDamage > 0 || component.durableDamage > 0)) return null;
  const effectSource = attackWithAreaEffects(attack);
  const statusSources = [effectSource, ...linkedGroups.map(({ group }) => attackWithAreaEffects(group))];
  const statuses = statusSources.flatMap((source) => {
    const status = extractStatusApplication(item, source, 1);
    return status ? [status] : [];
  });
  const effects = statusSources.flatMap((source) => extractNonDamageEffects(item, source, 1));
  return {
    components,
    statuses: [...new Map(statuses.map((status) => [status.id, status])).values()],
    effects: [...new Map(effects.map((effect) => [effect.id, effect])).values()],
    unresolvedLinkedExplosion: uniqueLinkedNames.length > linkedGroups.length,
  };
}

function payloadProfile(item: Item, source: PayloadSource, sourceDelivery: CombatSourceDelivery): WeaponProfile | null {
  const sourceAttackNames = attackNames(source.attacks);
  const reviewed = REVIEWED_STRATAGEM_DELIVERY[identity(item)];
  const candidateAttackNames = reviewed?.attackName ? [reviewed.attackName] : sourceAttackNames;
  const selected = candidateAttackNames
    .map((name) => ({ name, extracted: componentsForAttack(item, name) }))
    .find(({ extracted }) => extracted);
  if (!selected?.extracted) return null;
  const subordinateExplosion = sourceAttackNames
    .filter((name) => canonicalAttackName(name) !== canonicalAttackName(selected.name))
    .map((name) => componentsForAttack(item, name))
    .find((candidate) => candidate?.components.some(({ kind }) => kind === "explosion"));
  if (subordinateExplosion && (
    reviewed?.combineAllAttacks
    || !selected.extracted.components.some(({ kind }) => kind === "explosion")
  )) {
    selected.extracted.components.push(
      ...subordinateExplosion.components.filter(({ kind }) => kind === "explosion"),
    );
    selected.extracted.statuses.push(...subordinateExplosion.statuses);
    selected.extracted.effects.push(...subordinateExplosion.effects);
  }
  const id = identity(item);
  const persistent = sourceDelivery.kind === "persistent-area";
  const sourcedRate = parseFirstNumber(source.base["Fire Rate"])
    ?? item.simulation?.fireRateRpm
    ?? null;
  let roundsPerMinute = reviewed?.roundsPerMinute ?? sourcedRate ?? 60;
  const sourcedCapacity = parseCount(source.base.Capacity)
    ?? item.simulation?.capacity
    ?? null;
  const sourcedDeploymentCount = parseCount(source.base.Bombs) !== null
    || parseCount(source.base.Salvos) !== null
    || sourcedCapacity !== null
    || reviewed?.totalPayloads !== undefined;
  let capacity = reviewed?.capacity ?? sourcedCapacity ?? sourceDelivery.totalPayloads;
  let firingDurationSeconds: number | undefined;
  if (persistent && sourceDelivery.activeDurationSeconds && id === "orbitallaser") {
    roundsPerMinute = 60;
    capacity = sourceDelivery.activeDurationSeconds;
    firingDurationSeconds = sourceDelivery.activeDurationSeconds;
  }
  const projectile = asPropertyRecord(findPropertyGroup(item, selected.name)?.Projectile);
  const pelletCount = parseCount(projectile?.Pellets) ?? 1;
  const components = selected.extracted.components.map((component) => ({
    ...component,
    packetsPerProjectile: component.kind === "direct" ? pelletCount : component.packetsPerProjectile,
  }));
  return {
    id: `${id}:${source.id}`,
    itemDisplayName: item.displayName,
    label: reviewed?.profileLabel ?? (source.label === "Primary payload" ? selected.name : source.label),
    kind: persistent ? "spray" : pelletCount > 1 ? "shotgun" : "projectile",
    roundsPerMinute,
    capacity,
    ...(firingDurationSeconds === undefined ? {} : { firingDurationSeconds }),
    firingModes: item.simulation?.firingModes ?? [],
    sourceVersion: item.stratagemSimulation?.sourceVersion ?? item.simulation?.sourceVersion,
    trigger: {
      kind: persistent ? "continuous" : "single",
      ammoPerTrigger: 1,
      projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
      triggerIntervalSeconds: 60 / roundsPerMinute,
    },
    resource: {
      id: `${id}:${source.id}:payloads`,
      unit: persistent ? "unlimited" : "round",
      capacity,
      ...(persistent ? { infinite: true as const } : {}),
    },
    components,
    statuses: selected.extracted.statuses,
    effects: selected.extracted.effects,
    assumptions: [
      "Point-blank damage with no falloff",
      "The selected payload hits the aimed body part",
      ...sourceDelivery.assumptions,
    ],
    warnings: [
      ...(selected.extracted.unresolvedLinkedExplosion ? ["One or more linked explosion records could not be normalized."] : []),
      ...(sourceAttackNames.length > 1 && !subordinateExplosion && !reviewed?.attackName
        ? ["Only the first independently damage-bearing payload in this source configuration is modeled."]
        : []),
      ...(sourcedRate === null && reviewed?.roundsPerMinute === undefined
        && ["support-weapon", "mounted-weapon", "autonomous-weapon"].includes(sourceDelivery.kind)
        ? ["Fire rate is unavailable; 60 rpm is a sequencing placeholder, so DPS and TTK timing are partial."]
        : []),
      ...(sourcedCapacity === null && reviewed?.capacity === undefined
        && ["support-weapon", "mounted-weapon", "autonomous-weapon"].includes(sourceDelivery.kind)
        ? ["Deployment capacity is unavailable; full-deployment output is partial."]
        : []),
      ...(!sourcedDeploymentCount && ["focused-strike", "distributed-strike", "persistent-area", "trap"].includes(sourceDelivery.kind)
        ? ["Deployment payload count is unavailable; one payload is shown as a per-payload placeholder and total area output is partial."]
        : []),
      ...(reviewed?.note ? [reviewed.note] : []),
    ],
  };
}

function annotateWeaponProfiles(item: Item, profiles: WeaponProfile[]): CombatSourceProfile[] {
  const sourceDelivery = delivery(item);
  return profiles.map((profile) => ({
    ...profile,
    sourceKind: "stratagem",
    delivery: {
      ...sourceDelivery,
      totalPayloads: profile.resource.capacity,
      replenishment: profile.reload
        ? "reload"
        : item.tags?.some((tag) => /expendable/i.test(tag)) ? "disposable" : "resupply",
      exposureScenarios: [{
        id: "weapon-fire",
        label: "Weapon fire",
        payloadHits: 1,
        confidence: "sourced",
      }],
    },
  }));
}

export function extractStratagemProfiles(item: Item): CombatSourceProfileResult {
  const kind = sourceKind(item);
  if (kind === "support-weapon") {
    const weaponResult = extractWeaponProfiles(item);
    if (weaponResult.profiles.length) {
      return {
        profiles: annotateWeaponProfiles(item, weaponResult.profiles),
        unsupportedReasons: weaponResult.unsupportedReasons,
      };
    }
  }

  const sources = collectPayloadSources(item);
  const profiles = sources.flatMap((source) => {
    const sourceDelivery = delivery(item, source);
    const profile = payloadProfile(item, source, sourceDelivery);
    if (!profile) return [];
    const combatProfile: CombatSourceProfile = { ...profile, sourceKind: "stratagem", delivery: sourceDelivery };
    const duration = sourceDelivery.activeDurationSeconds;
    if (
      sourceDelivery.kind !== "persistent-area"
      || identity(item) === "orbitallaser"
      || duration === undefined
      || !profile.statuses.length
    ) return [combatProfile];
    const ticks = Math.max(1, Math.floor(duration));
    const statusNames = profile.statuses.map(({ label }) => label).join(" + ");
    const fieldProfile: CombatSourceProfile = {
      ...combatProfile,
      id: `${combatProfile.id}:persistent-field`,
      label: `${statusNames} field exposure`,
      kind: "spray",
      roundsPerMinute: 60,
      capacity: ticks,
      firingDurationSeconds: duration,
      trigger: {
        kind: "continuous",
        ammoPerTrigger: 1,
        projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
        triggerIntervalSeconds: 1,
      },
      resource: {
        id: `${combatProfile.id}:persistent-field-duration`,
        unit: "fuel",
        capacity: ticks,
      },
      components: [],
      assumptions: [
        `One status-application check per second across the sourced ${duration}s damaging field duration.`,
        "Impact and explosion damage are excluded from this field-only profile.",
      ],
      warnings: [],
      delivery: {
        ...sourceDelivery,
        totalPayloads: ticks,
        exposureScenarios: [
          { id: "one-second", label: "1 second in field", payloadHits: 1, confidence: "sourced" },
          {
            id: "full-duration",
            label: `Full ${duration}s in field`,
            payloadHits: ticks,
            confidence: "estimated",
            note: "Upper-bound scenario: the selected target remains inside the damaging area for its full sourced duration.",
          },
        ],
      },
    };
    return [combatProfile, fieldProfile];
  });
  if (profiles.length) return { profiles, unsupportedReasons: [] };

  const hasDamageRecord = Object.values(item.properties ?? {}).some((raw) => {
    const group = asPropertyRecord(raw);
    return group && (asPropertyRecord(group.Damage) || asPropertyRecord(group.Penetration));
  });
  return {
    profiles: [],
    unsupportedReasons: [hasDamageRecord
      ? "Damage records exist, but no complete supported payload profile could be normalized."
      : "No enemy-damage payload is defined for this utility stratagem."],
    ...(hasDamageRecord ? {} : { intentionallyNonDamaging: true as const }),
  };
}

export function profileForExposure(profile: CombatSourceProfile, scenario: TargetExposureScenario) {
  const hits = Math.max(1, Math.floor(scenario.payloadHits));
  const sequentialPersistentField = profile.delivery.kind === "persistent-area"
    && profile.components.length === 0
    && profile.statuses.length > 0;
  return {
    ...profile,
    id: `${profile.id}:exposure:${scenario.id}`,
    capacity: hits,
    ...(sequentialPersistentField ? { firingDurationSeconds: hits } : {}),
    trigger: sequentialPersistentField
      ? {
          ...profile.trigger,
          kind: "continuous" as const,
          ammoPerTrigger: 1,
          projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
        }
      : {
          ...profile.trigger,
          kind: hits === 1 ? "single" as const : "volley" as const,
          ammoPerTrigger: hits,
          projectileEvents: [{ offsetSeconds: 0, projectiles: hits }],
        },
    resource: {
      ...profile.resource,
      capacity: hits,
      infinite: undefined,
      reload: undefined,
    },
    assumptions: [...profile.assumptions, `Target exposure: ${scenario.label} (${scenario.confidence}).`],
  } satisfies CombatSourceProfile;
}

export function validateStratagemProfiles(item: Item, result = extractStratagemProfiles(item)) {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const profile of result.profiles) {
    if (ids.has(profile.id)) problems.push(`Duplicate profile ID '${profile.id}'.`);
    ids.add(profile.id);
    if (profile.resource.capacity <= 0) problems.push(`Profile '${profile.id}' has a non-positive capacity.`);
    if (profile.roundsPerMinute <= 0) problems.push(`Profile '${profile.id}' has a non-positive rate.`);
    if (profile.delivery.totalPayloads <= 0) problems.push(`Profile '${profile.id}' has no deployment payloads.`);
    const exposureIds = new Set<string>();
    for (const scenario of profile.delivery.exposureScenarios) {
      if (exposureIds.has(scenario.id)) problems.push(`Profile '${profile.id}' has duplicate exposure '${scenario.id}'.`);
      exposureIds.add(scenario.id);
      if (scenario.payloadHits <= 0) problems.push(`Exposure '${profile.id}:${scenario.id}' has no target payloads.`);
      if (scenario.payloadHits > profile.delivery.totalPayloads) {
        problems.push(`Exposure '${profile.id}:${scenario.id}' exceeds its ${profile.delivery.totalPayloads} deployment payloads.`);
      }
    }
  }
  if (!result.profiles.length && !result.intentionallyNonDamaging && !result.unsupportedReasons.length) {
    problems.push("Unclassified stratagem.");
  }
  return problems;
}
