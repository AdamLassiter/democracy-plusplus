import type { Item, PropertyValue, WeaponSourceConfiguration } from "../../types";
import { parsePenetration } from "../capabilities.ts";
import { asPropertyRecord, parseCount, parseDamageValue, parseFirstNumber } from "./parse.ts";
import { buildWeaponSourceConfigurations } from "./sourceConfigurations.ts";
import type {
  DamageComponent,
  WeaponProfile,
  WeaponProfileResult,
  WeaponNonDamageEffect,
  WeaponStatusApplication,
} from "./types.ts";

function unsupported(...reasons: string[]): WeaponProfileResult {
  return { profiles: [], unsupportedReasons: reasons };
}

function normalizedAttackName(value: string) {
  return value.replace(/^\*+/, "").trim();
}

function canonicalAttackName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function directAttackNames(attacks: Record<string, PropertyValue>) {
  return Object.keys(attacks)
    .filter((name) => /^\*(?!\*)/.test(name))
    .map(normalizedAttackName);
}

function childAttackNames(attacks: Record<string, PropertyValue>, type?: string) {
  return Object.entries(attacks)
    .filter(([name, value]) => /^\*\*/.test(name) && (!type || String(value).toLowerCase() === type.toLowerCase()))
    .map(([name]) => normalizedAttackName(name));
}

function findPropertyGroup(item: Item, name: string) {
  const direct = item.properties?.[name];
  if (direct) return asPropertyRecord(direct);
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = Object.entries(item.properties ?? {}).find(([candidate]) =>
    candidate.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
  );
  return asPropertyRecord(match?.[1]);
}

function findLinkedPropertyGroup(item: Item, name: PropertyValue | undefined) {
  if (typeof name !== "string") return null;
  const canonical = canonicalAttackName(name);
  const match = Object.entries(item.properties ?? {}).find(([candidate]) =>
    canonicalAttackName(candidate) === canonical,
  );
  return match ? { name: match[0], group: asPropertyRecord(match[1]) } : null;
}

function extractDirectComponent(attackName: string, attack: Record<string, PropertyValue>) {
  const damage = asPropertyRecord(attack.Damage);
  const penetration = asPropertyRecord(attack.Penetration);
  const standard = parseDamageValue(damage?.Standard);
  const durable = parseDamageValue(damage?.["vs. Durable"]);
  const armorPenetration = parsePenetration(penetration?.Direct);
  if (!standard || !durable || armorPenetration === null) return null;

  return {
    id: attackName,
    kind: "direct",
    standardDamage: standard.amount,
    durableDamage: durable.amount,
    armorPenetration,
    damageType: standard.damageType,
    packetsPerProjectile: 1,
  } satisfies DamageComponent;
}

function extractExplosionComponent(attackName: string, attack: Record<string, PropertyValue>) {
  const damage = asPropertyRecord(attack.Damage);
  const penetration = asPropertyRecord(attack.Penetration);
  const standard = parseDamageValue(damage?.["Inner Radius"]);
  const durable = parseDamageValue(damage?.["Inner Durable"]);
  const armorPenetration = parsePenetration(penetration?.["Inner AP"]);
  if (!standard || !durable || armorPenetration === null) return null;
  const outerStandard = parseFirstNumber(damage?.["Outer Radius"]);
  const outerDurable = parseFirstNumber(damage?.["Outer Durable"]);
  const outerArmorPenetration = parsePenetration(penetration?.["Outer AP"]);
  return {
    id: attackName,
    kind: "explosion",
    standardDamage: standard.amount,
    durableDamage: durable.amount,
    armorPenetration,
    damageType: standard.damageType,
    packetsPerProjectile: 1,
    radius: "inner",
    ...(outerStandard !== null && outerDurable !== null && outerArmorPenetration !== null
      ? { outer: {
        standardDamage: outerStandard,
        durableDamage: outerDurable,
        armorPenetration: outerArmorPenetration,
      } }
      : {}),
  } satisfies DamageComponent;
}

function configureProjectileExplosion(
  item: Item,
  projectile: Record<string, PropertyValue> | null,
  component: DamageComponent | null,
) {
  if (!component || !projectile) return component;
  const minimumArmingDistanceMeters = parseFirstNumber(projectile["Arming Distance"]);
  const delayedSeconds = item.internalName === "p34breacher"
    ? parseFirstNumber(projectile.Lifetime)
    : null;
  return {
    ...component,
    ...(minimumArmingDistanceMeters !== null && minimumArmingDistanceMeters > 0
      ? { minimumArmingDistanceMeters }
      : {}),
    ...(delayedSeconds !== null && delayedSeconds > 0 ? { offsetSeconds: delayedSeconds } : {}),
  };
}

function extractStatusApplication(
  item: Item,
  attack: Record<string, PropertyValue>,
  packetsPerProjectile: number,
) {
  const specialEffects = asPropertyRecord(attack["Special Effects"]);
  if (typeof specialEffects?.Status !== "string") return null;
  const strengthPerPacket = parseFirstNumber(specialEffects["Status Strength"]);
  const linked = findLinkedPropertyGroup(item, specialEffects.Status);
  if (!linked?.group || strengthPerPacket === null || strengthPerPacket <= 0) return null;
  const status = asPropertyRecord(linked.group.Status);
  const damage = asPropertyRecord(linked.group.Damage);
  const penetration = asPropertyRecord(linked.group.Penetration);
  const durationSeconds = parseFirstNumber(status?.["Status Duration"]);
  const standard = parseDamageValue(damage?.Standard);
  const durable = parseDamageValue(damage?.["vs. Durable"]);
  const armorPenetration = parsePenetration(penetration?.Direct);
  if (
    durationSeconds === null
    || durationSeconds <= 0
    || !standard
    || !durable
    || armorPenetration === null
  ) return null;

  return {
    id: canonicalAttackName(linked.name),
    label: linked.name,
    strengthPerPacket,
    packetsPerProjectile,
    durationSeconds,
    stacking: "refresh",
    targetPool: "main",
    damagePerSecond: {
      id: linked.name,
      kind: "status",
      standardDamage: standard.amount,
      durableDamage: durable.amount,
      armorPenetration,
      damageType: standard.damageType,
      packetsPerProjectile: 1,
    },
  } satisfies WeaponStatusApplication;
}

function extractNonDamageEffects(
  item: Item,
  attack: Record<string, PropertyValue>,
  packetsPerProjectile: number,
) {
  const specialEffects = asPropertyRecord(attack["Special Effects"]);
  if (!specialEffects) return [];
  const statusNames = [specialEffects.Status, specialEffects["Second Status"], specialEffects["Third Status"]]
    .filter((value): value is string => typeof value === "string");
  return statusNames.flatMap<WeaponNonDamageEffect>((name) => {
    const linked = findLinkedPropertyGroup(item, name);
    if (!linked?.group || asPropertyRecord(linked.group.Damage)) return [];
    const status = asPropertyRecord(linked.group.Status);
    const durationSeconds = parseFirstNumber(status?.["Status Duration"]);
    const strengthPerPacket = name === specialEffects.Status
      ? parseFirstNumber(specialEffects["Status Strength"])
      : 1;
    if (durationSeconds === null || durationSeconds <= 0 || strengthPerPacket === null) return [];
    return [{
      id: canonicalAttackName(linked.name),
      label: linked.name,
      strengthPerPacket,
      packetsPerProjectile,
      durationSeconds,
    }];
  });
}

function extractChargeProfiles(
  item: Item,
  base: Record<string, PropertyValue>,
  attacks: Record<string, PropertyValue>,
  charge: Record<string, PropertyValue>,
): WeaponProfileResult {
  const mechanicalRpm = parseFirstNumber(base["Fire Rate"])
    ?? item.simulation?.fireRateRpm
    ?? null;
  const capacity = parseCount(base.Capacity) ?? item.simulation?.capacity ?? null;
  if (mechanicalRpm === null || mechanicalRpm <= 0 || capacity === null || capacity <= 0) {
    return unsupported("Charge profiles require a positive mechanical fire rate and capacity.");
  }
  const defaultAttack = directAttackNames(attacks)[0];
  const profiles: WeaponProfile[] = [];
  const failures: string[] = [];

  for (const [key, rawValue] of Object.entries(charge)) {
    const timeMatch = key.match(/^at\s*\((\d+(?:\.\d+)?)\)s$/i);
    if (!timeMatch || typeof rawValue !== "string") continue;
    const valueMatch = rawValue.match(/(\d+(?:\.\d+)?)\s*dmg\s*[×x]\s*(.+)$/i);
    if (!valueMatch) {
      failures.push(`Charge breakpoint '${key}' has an unsupported damage expression.`);
      continue;
    }
    const chargeSeconds = Number.parseFloat(timeMatch[1]);
    const multiplier = Number.parseFloat(valueMatch[1]);
    const requestedAttack = valueMatch[2].trim();
    const attackName = /^default$/i.test(requestedAttack) ? defaultAttack : requestedAttack;
    const attack = attackName ? findPropertyGroup(item, attackName) : null;
    if (!attackName || !attack) {
      failures.push(`Charge breakpoint '${key}' references unknown attack '${requestedAttack}'.`);
      continue;
    }
    const direct = extractDirectComponent(attackName, attack);
    if (!direct) {
      failures.push(`Charge attack '${attackName}' has incomplete direct damage.`);
      continue;
    }
    const projectile = asPropertyRecord(attack.Projectile);
    const linkedExplosion = findLinkedPropertyGroup(
      item,
      projectile?.["Explode After"] ?? projectile?.["Explosion On Impact"],
    );
    const explosion = linkedExplosion?.group
      ? configureProjectileExplosion(
          item,
          projectile,
          extractExplosionComponent(linkedExplosion.name, linkedExplosion.group),
        )
      : null;
    if ((projectile?.["Explode After"] || projectile?.["Explosion On Impact"]) && !explosion) {
      failures.push(`Charge attack '${attackName}' has an unresolvable linked explosion.`);
      continue;
    }
    const components = [direct, ...(explosion ? [explosion] : [])].map((component) => ({
      ...component,
      standardDamage: component.standardDamage * multiplier,
      durableDamage: component.durableDamage * multiplier,
    }));
    const minimumArmingDistance = explosion?.minimumArmingDistanceMeters;
    const mechanicalInterval = 60 / mechanicalRpm;
    const firingInterval = Math.max(mechanicalInterval, chargeSeconds);
    const warnings: string[] = [];
    if (
      item.simulation?.reload?.emptySeconds === undefined
      && item.simulation?.reload?.perRoundSeconds === undefined
      && item.simulation?.reload?.firstRoundSeconds === undefined
    ) {
      warnings.push("Sustained DPS is unavailable because reload time is missing.");
    }
    profiles.push({
      id: `${item.internalName ?? item.displayName}:charge:${chargeSeconds}:${attackName}`,
      itemDisplayName: item.displayName,
      label: `${chargeSeconds.toFixed(2)}s charge · ${attackName}`,
      kind: "charge",
      roundsPerMinute: 60 / firingInterval,
      capacity,
      warmupSeconds: chargeSeconds,
      chargeSeconds,
      reload: item.simulation?.reload,
      firingModes: item.simulation?.firingModes ?? [],
      sourceVersion: item.simulation?.sourceVersion,
      trigger: {
        kind: "single",
        ammoPerTrigger: 1,
        projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
        triggerIntervalSeconds: firingInterval,
        cycleStartDelaySeconds: chargeSeconds,
      },
      resource: {
        id: `${item.internalName ?? item.displayName}:charge-ammunition`,
        unit: "round",
        capacity,
        reload: item.simulation?.reload,
      },
      components,
      statuses: [],
      effects: [],
      assumptions: [
        minimumArmingDistance === undefined
          ? "Point-blank damage with no falloff"
          : `Raw damage assumes the projectile travels at least ${minimumArmingDistance}m and arms; target TTK uses the selected engagement distance`,
        "Every charged projectile hits",
        `Every shot is held to the ${chargeSeconds.toFixed(2)}s source breakpoint`,
        ...(explosion ? [
          "Projectile hits and the selected part receives inner-radius explosion damage",
          "Other body parts receive blast damage only when an impact scenario is selected",
        ] : []),
      ],
      warnings,
    });
  }
  return profiles.length
    ? { profiles, unsupportedReasons: failures }
    : unsupported(...(failures.length ? failures : ["No source-defined charge breakpoints could be normalized."]));
}

function extractHeatBandProfile(item: Item): WeaponProfileResult | null {
  if (item.displayName !== "LAS-17 Double-Edge Sickle") return null;
  const weapon = Object.values(item.properties ?? {})
    .map(asPropertyRecord)
    .find((candidate) => asPropertyRecord(candidate?.["Heat Data"]) && asPropertyRecord(candidate?.Attacks));
  const base = asPropertyRecord(weapon?.Base);
  const heat = asPropertyRecord(weapon?.["Heat Data"]);
  const attacks = asPropertyRecord(weapon?.Attacks);
  if (!base || !heat || !attacks) return unsupported("The heat-state source block is incomplete.");
  const roundsPerMinute = parseFirstNumber(base["Fire Rate"]) ?? item.simulation?.fireRateRpm ?? null;
  const heatPerProjectile = parseFirstNumber(heat["Heat Per Shot"]);
  const threshold = parseFirstNumber(heat["Overheats at"]);
  const coolingRatesPerSecond = typeof heat["Cool Per Sec"] === "string"
    ? [...heat["Cool Per Sec"].matchAll(/\d+(?:\.\d+)?/g)].map(([value]) => Number.parseFloat(value))
    : [];
  const attackNames = directAttackNames(attacks);
  const minimumFractions = [0, 0.26, 0.51, 0.91];
  const labels = ["0–25% heat", "26–50% heat", "51–90% heat", "91%+ heat"];
  const components = attackNames.map((attackName) => {
    const attack = findPropertyGroup(item, attackName);
    return attack ? extractDirectComponent(attackName, attack) : null;
  });
  if (
    roundsPerMinute === null
    || roundsPerMinute <= 0
    || heatPerProjectile === null
    || heatPerProjectile <= 0
    || threshold === null
    || threshold <= 0
    || components.length !== 4
    || components.some((component) => !component)
  ) return unsupported("The four sourced heat bands could not be normalized.");
  const bands = components.map((component, index) => ({
    minimumFraction: minimumFractions[index],
    label: labels[index],
    components: [component!],
  }));
  const capacity = Math.ceil(threshold / heatPerProjectile) + 1;
  const warmupSeconds = parseFirstNumber(heat.Warmup) ?? 0;
  return {
    profiles: [{
      id: `${item.internalName ?? item.displayName}:heat-state`,
      itemDisplayName: item.displayName,
      label: "Automatic heat progression",
      kind: "heat-projectile",
      roundsPerMinute,
      capacity,
      infiniteCapacity: true,
      warmupSeconds,
      firingModes: item.simulation?.firingModes ?? [],
      sourceVersion: item.simulation?.sourceVersion,
      trigger: {
        kind: "single",
        ammoPerTrigger: 1,
        projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
        triggerIntervalSeconds: 60 / roundsPerMinute,
        ...(warmupSeconds > 0 ? { cycleStartDelaySeconds: warmupSeconds } : {}),
      },
      resource: {
        id: `${item.internalName ?? item.displayName}:heat`,
        unit: "unlimited",
        capacity,
        infinite: true,
      },
      components: bands[0].components,
      statuses: [],
      effects: [],
      heatState: {
        heatPerProjectile,
        threshold,
        coolingRatesPerSecond,
        saturates: true,
        bands,
      },
      assumptions: [
        "Continuous fire from a cold heat sink",
        "Attack components change automatically at the sourced heat thresholds",
        "Heat saturates at 100% and firing continues in the final band",
      ],
      warnings: [
        "Self-damage and ignition at high heat are shown as handling consequences and do not add enemy damage.",
        "Controlled cooling DPS is unavailable because the source lists several cooling rates without machine-readable selection conditions.",
      ],
    }],
    unsupportedReasons: [],
  };
}

function extractStandardProfiles(item: Item): WeaponProfileResult {
  const propertyGroups = Object.entries(item.properties ?? {});
  const baseEntry = propertyGroups.find(([, value]) => {
    const group = asPropertyRecord(value);
    return Boolean(asPropertyRecord(group?.Base) && asPropertyRecord(group?.Attacks));
  });
  if (!baseEntry) return unsupported("No weapon base and attack mapping is available.");

  const weapon = asPropertyRecord(baseEntry[1]);
  if (!weapon) return unsupported("Weapon properties are not a structured record.");
  const base = asPropertyRecord(weapon.Base);
  const attacks = asPropertyRecord(weapon.Attacks);
  if (!base || !attacks) return unsupported("Weapon base statistics are incomplete.");

  const charge = asPropertyRecord(weapon.Charge);
  if (charge) return extractChargeProfiles(item, base, attacks, charge);
  const heat = asPropertyRecord(weapon["Heat Data"]);
  const heatPerShot = parseFirstNumber(heat?.["Heat Per Shot"]);
  const heatPerSecond = parseFirstNumber(heat?.["Heat Per Second"]);
  const overheatThreshold = parseFirstNumber(heat?.["Overheats at"]);
  const warmupSeconds = parseFirstNumber(heat?.Warmup) ?? 0;
  let roundsPerMinute = parseFirstNumber(base["Fire Rate"])
    ?? parseFirstNumber(heat?.["Beam Fire Rate"])
    ?? item.simulation?.fireRateRpm
    ?? null;
  let capacity = parseCount(base.Capacity);
  let infiniteCapacity = item.simulation?.infiniteCapacity === true;
  let firingDurationSeconds: number | undefined;
  if (heat && overheatThreshold !== null && heatPerShot !== null && heatPerShot > 0) {
    capacity = Math.ceil(overheatThreshold / heatPerShot);
  } else if (heat && overheatThreshold !== null && heatPerSecond !== null && heatPerSecond > 0) {
    firingDurationSeconds = overheatThreshold / heatPerSecond;
    if (roundsPerMinute !== null && roundsPerMinute > 0) {
      capacity = firingDurationSeconds * roundsPerMinute / 60;
    }
  }
  const attackNames = directAttackNames(attacks);
  if (attackNames.length !== 1) {
    return unsupported("The weapon must expose exactly one primary attack for this simulator class.");
  }
  const attackName = attackNames[0];
  const attack = findPropertyGroup(item, attackName);
  if (!attack) return unsupported(`The primary attack '${attackName}' could not be resolved.`);

  const projectile = asPropertyRecord(attack.Projectile);
  const beam = asPropertyRecord(attack.Beam);
  const pelletCount = parseCount(projectile?.Pellets);
  const component = extractDirectComponent(attackName, attack);
  if (!component) {
    return unsupported(
      "The primary attack has no complete direct-damage record; healing and other non-damaging projectiles are excluded.",
    );
  }
  component.packetsPerProjectile = pelletCount ?? 1;
  if (beam && heat) component.packetsPerProjectile = parseCount(heat.Beams) ?? 1;
  const arc = asPropertyRecord(attack.Arc);
  const isMelee = component.damageType.toLowerCase() === "melee";
  const isSpray = item.simulation?.listedDps !== undefined && item.simulation.capacitySeconds !== undefined;
  if (roundsPerMinute === null && item.simulation?.listedDps && component.standardDamage > 0) {
    roundsPerMinute = item.simulation.listedDps
      / (component.standardDamage * component.packetsPerProjectile)
      * 60;
  }
  if (isMelee || arc) infiniteCapacity = true;
  if (infiniteCapacity && (capacity === null || capacity <= 0)) capacity = 1;
  const sprayDuration = item.simulation?.capacitySeconds;
  if (isSpray && roundsPerMinute !== null && sprayDuration !== undefined) {
    firingDurationSeconds = sprayDuration;
    capacity = sprayDuration * roundsPerMinute / 60;
  } else if ((capacity === null || capacity <= 0) && item.simulation?.capacity) {
    capacity = item.simulation.capacity;
  }
  if (roundsPerMinute === null || roundsPerMinute <= 0) {
    return unsupported("A positive fire rate is required.");
  }
  if (capacity === null || capacity <= 0) return unsupported("A positive weapon capacity or heat cycle is required.");
  const linkedExplosion = findLinkedPropertyGroup(
    item,
    projectile?.["Explode After"] ?? projectile?.["Explosion On Impact"],
  );
  const hierarchyExplosionName = childAttackNames(attacks, "Explosion")[0];
  const hierarchyExplosion = hierarchyExplosionName
    ? findPropertyGroup(item, hierarchyExplosionName)
    : null;
  const resolvedExplosion = linkedExplosion?.group
    ? linkedExplosion
    : hierarchyExplosion && hierarchyExplosionName
      ? { name: hierarchyExplosionName, group: hierarchyExplosion }
      : null;
  const explosionComponent = resolvedExplosion?.group
    ? configureProjectileExplosion(
        item,
        projectile,
        extractExplosionComponent(resolvedExplosion.name, resolvedExplosion.group),
      )
    : null;
  if ((projectile?.["Explode After"] || projectile?.["Explosion On Impact"]) && !explosionComponent) {
    return unsupported("The linked explosion could not be normalized.");
  }

  const warnings: string[] = [];
  if (
    !infiniteCapacity
    && item.simulation?.reload?.emptySeconds === undefined
    && item.simulation?.reload?.perRoundSeconds === undefined
    && item.simulation?.reload?.firstRoundSeconds === undefined
  ) {
    warnings.push("Sustained DPS is unavailable because reload time is missing.");
  }
  const specialEffects = asPropertyRecord(attack["Special Effects"]);
  const statusApplication = extractStatusApplication(item, attack, component.packetsPerProjectile);
  const effects = extractNonDamageEffects(item, attack, component.packetsPerProjectile);
  const subordinateStatusNames = childAttackNames(attacks, "status");
  if (specialEffects?.Status && !statusApplication && effects.length === 0) {
    warnings.push(`The ${String(specialEffects.Status)} status is present but its damage definition is incomplete.`);
  }
  if (!specialEffects?.Status && subordinateStatusNames.length > 0) {
    warnings.push(
      `${subordinateStatusNames.join(" and ")} are subordinate status payloads, but the source does not expose application strength; combined status damage is excluded.`,
    );
  }

  const profileKind = isSpray
    ? "spray"
    : isMelee
      ? "melee"
      : arc
        ? "arc"
        : beam && heat
    ? "beam"
    : heat
      ? "heat-projectile"
      : pelletCount && pelletCount > 1
        ? "shotgun"
      : "projectile";
  const minimumArmingDistance = explosionComponent?.minimumArmingDistanceMeters;

  const profile: WeaponProfile = {
    id: `${item.internalName ?? item.displayName}:primary`,
    itemDisplayName: item.displayName,
    label: attackName,
    kind: profileKind,
    roundsPerMinute,
    capacity,
    ...(infiniteCapacity ? { infiniteCapacity: true } : {}),
    ...(firingDurationSeconds === undefined ? {} : { firingDurationSeconds }),
    ...(warmupSeconds > 0 ? { warmupSeconds } : {}),
    reload: item.simulation?.reload,
    firingModes: item.simulation?.firingModes ?? [],
    sourceVersion: item.simulation?.sourceVersion,
    trigger: {
      kind: isSpray || beam ? "continuous" : "single",
      ammoPerTrigger: 1,
      projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
      triggerIntervalSeconds: 60 / roundsPerMinute,
      ...(warmupSeconds > 0 ? { cycleStartDelaySeconds: warmupSeconds } : {}),
    },
    resource: {
      id: `${item.internalName ?? item.displayName}:primary-resource`,
      unit: infiniteCapacity
        ? "unlimited"
        : isSpray
          ? "fuel"
          : heat
            ? "heat-sink"
            : pelletCount && pelletCount > 1
              ? "shell"
              : "round",
      capacity,
      ...(infiniteCapacity ? { infinite: true } : {}),
      reload: item.simulation?.reload,
    },
    components: [component, ...(explosionComponent ? [explosionComponent] : [])],
    statuses: statusApplication ? [statusApplication] : [],
    effects,
    assumptions: [
      minimumArmingDistance === undefined
        ? "Point-blank damage with no falloff"
        : `Raw damage assumes the projectile travels at least ${minimumArmingDistance}m and arms; target TTK uses the selected engagement distance`,
      "Every shot hits",
      "Maximum listed fire rate",
      ...(pelletCount && pelletCount > 1 ? [`All ${pelletCount} pellets hit`] : []),
      ...(beam && component.packetsPerProjectile > 1 ? [`All ${component.packetsPerProjectile} beams hit`] : []),
      ...(arc ? ["Only the initial arc is included in single-target damage; chained targets are excluded"] : []),
      ...(explosionComponent ? [
        "Projectile hits and the selected part receives inner-radius explosion damage",
        "Other body parts receive blast damage only when an impact scenario is selected",
        ...(explosionComponent.offsetSeconds
          ? [`Explosion occurs ${explosionComponent.offsetSeconds}s after impact`]
          : []),
      ] : []),
      ...(heat ? ["Weapon fires until overheat, then replaces its heat sink; passive cooling is not included"] : []),
      ...(isSpray ? ["Listed infobox DPS is converted to source damage ticks over the documented fuel duration"] : []),
      ...(isMelee ? ["Continuous repeated swings at the listed maximum attack rate"] : []),
    ],
    warnings,
  };
  return { profiles: [profile], unsupportedReasons: [] };
}

type ProfileOverrides = {
  id: string;
  label: string;
  base: Record<string, PropertyValue>;
  attacks: Record<string, PropertyValue>;
  attackNames: string[];
  simulation?: Item["simulation"];
  note?: string;
};

function simulationForConfiguration(
  item: Item,
  configuration: WeaponSourceConfiguration,
): Item["simulation"] {
  return {
    ...withoutSprayFallbacks(item.simulation),
    ...(configuration.capacity === undefined ? {} : { capacity: configuration.capacity }),
    ...(configuration.fireRatesRpm?.length
      ? { fireRateRpm: configuration.fireRatesRpm.at(-1) }
      : {}),
    ...(configuration.reload === undefined ? {} : { reload: configuration.reload }),
    ...(configuration.capacitySeconds === undefined
      ? {}
      : { capacitySeconds: configuration.capacitySeconds }),
    ...(configuration.listedDps === undefined ? {} : { listedDps: configuration.listedDps }),
    sourceVersion: configuration.sourceVersion ?? item.simulation?.sourceVersion,
  };
}

function baseForConfiguration(configuration: WeaponSourceConfiguration) {
  return configuration.capacity === undefined
    ? configuration.base
    : { ...configuration.base, Capacity: String(configuration.capacity) };
}

function extractConfiguredProfiles(item: Item, overrides: ProfileOverrides): WeaponProfileResult {
  let selectedParent = false;
  const configuredAttacks = Object.fromEntries(Object.entries(overrides.attacks).filter(([name]) => {
    if (/^\*(?!\*)/.test(name)) {
      const normalized = normalizedAttackName(name);
      selectedParent = overrides.attackNames.some((attackName) =>
        canonicalAttackName(attackName) === canonicalAttackName(normalized),
      );
      return selectedParent;
    }
    return /^\*\*/.test(name) && selectedParent;
  }));
  const configuredItem: Item = {
    ...item,
    internalName: `${item.internalName ?? item.displayName}-${overrides.id}`,
    properties: {
      "SIMULATION CONFIGURATION": {
        Base: overrides.base,
        Attacks: configuredAttacks,
      },
      ...item.properties,
    },
    simulation: overrides.simulation ?? item.simulation,
  };
  const result = extractStandardProfiles(configuredItem);
  return {
    ...result,
    profiles: result.profiles.map((profile) => ({
      ...profile,
      id: `${item.internalName ?? item.displayName}:${overrides.id}`,
      itemDisplayName: item.displayName,
      label: overrides.label,
      assumptions: overrides.note ? [...profile.assumptions, overrides.note] : profile.assumptions,
      resource: {
        ...profile.resource,
        id: `${item.internalName ?? item.displayName}:${overrides.id}:resource`,
      },
    })),
  };
}

function withoutSprayFallbacks(simulation: Item["simulation"]) {
  if (!simulation) return undefined;
  const { capacitySeconds: _capacitySeconds, listedDps: _listedDps, ...rest } = simulation;
  return rest;
}

function extractCombinationProfiles(item: Item): WeaponProfileResult | null {
  const configurations = buildWeaponSourceConfigurations(item);
  if (!configurations.some(({ sourcePath }) => /^Underbarrel\b/i.test(sourcePath.at(-1) ?? ""))) {
    return null;
  }
  const results = configurations.map((configuration) => extractConfiguredProfiles(item, {
    id: configuration.id,
    label: configuration.label,
    base: baseForConfiguration(configuration),
    attacks: configuration.attacks,
    attackNames: configuration.attackNames,
    simulation: simulationForConfiguration(item, configuration),
    note: configuration.note,
  }));

  return {
    profiles: results.flatMap(({ profiles }) => profiles),
    unsupportedReasons: results.flatMap(({ unsupportedReasons }) => unsupportedReasons),
  };
}

function extractAlternateAttackProfiles(item: Item): WeaponProfileResult | null {
  const propertyGroups = Object.entries(item.properties ?? {});
  const root = propertyGroups
    .map(([, value]) => asPropertyRecord(value))
    .find((candidate) => asPropertyRecord(candidate?.Base) && asPropertyRecord(candidate?.Attacks));
  const base = asPropertyRecord(root?.Base);
  const attacks = asPropertyRecord(root?.Attacks);
  if (!base || !attacks || asPropertyRecord(root?.Charge)) return null;
  const attackNames = directAttackNames(attacks);
  if (attackNames.length <= 1) return null;

  const identity = item.internalName ?? canonicalAttackName(item.displayName);
  if (identity === "las17doubleedgesickle") return null;
  const sourceConfigurations = buildWeaponSourceConfigurations(item);
  const reviewed = sourceConfigurations.length > 1
    || sourceConfigurations[0]?.label !== "Primary attack";
  const configurations: WeaponSourceConfiguration[] = reviewed
    ? sourceConfigurations
    : attackNames.map((attackName, index) => ({
        ...sourceConfigurations[0],
        id: canonicalAttackName(attackName),
        label: attackName,
        default: index === 0 ? true : undefined,
        attackNames: [attackName],
        base,
        attacks,
      }));
  const results = configurations.map((configuration) => extractConfiguredProfiles(item, {
    id: configuration.id,
    label: configuration.label,
    base: baseForConfiguration(configuration),
    attacks: configuration.attacks,
    attackNames: configuration.attackNames,
    simulation: simulationForConfiguration(item, configuration),
    note: configuration.note,
  }));
  return {
    profiles: results.flatMap(({ profiles }) => profiles),
    unsupportedReasons: results.flatMap(({ unsupportedReasons }) => unsupportedReasons),
  };
}

function withTriggerMode(
  profile: WeaponProfile,
  mode: string,
  roundsPerMinute: number,
  projectiles: number | "remaining",
): WeaponProfile {
  const interval = 60 / roundsPerMinute;
  const remaining = projectiles === "remaining";
  return {
    ...profile,
    id: `${profile.id}:${canonicalAttackName(mode)}:${roundsPerMinute}`,
    label: `${mode} · ${remaining ? `${profile.resource.capacity} rounds` : `${projectiles} round${projectiles === 1 ? "" : "s"}`} · ${roundsPerMinute} rpm`,
    roundsPerMinute,
    firingModes: [mode],
    trigger: remaining
      ? {
          kind: "remaining-magazine",
          ammoPerTrigger: "remaining",
          projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
          triggerIntervalSeconds: interval * profile.resource.capacity,
          remainingProjectileIntervalSeconds: interval,
        }
      : {
          kind: projectiles === 1 ? "single" : "volley",
          ammoPerTrigger: projectiles,
          projectileEvents: [{ offsetSeconds: 0, projectiles }],
          triggerIntervalSeconds: interval,
        },
    assumptions: [
      ...profile.assumptions,
      `${mode} firing mode at ${roundsPerMinute} rpm`,
      ...(remaining ? ["Total mode commits every round remaining in the magazine"] : []),
    ],
  };
}

function extractModeProfiles(item: Item): WeaponProfileResult | null {
  const configuration = buildWeaponSourceConfigurations(item)[0];
  if (!configuration?.firingModes?.length) return null;
  const configuredResult = extractConfiguredProfiles(item, {
    id: configuration.id,
    label: configuration.label,
    base: baseForConfiguration(configuration),
    attacks: configuration.attacks,
    attackNames: configuration.attackNames,
    simulation: simulationForConfiguration(item, configuration),
    note: configuration.note,
  });
  const baseResult = configuredResult;
  const profile = baseResult.profiles[0];
  if (!profile) return baseResult;
  return {
    profiles: configuration.firingModes.flatMap((mode) => {
      const rates = mode.compatibleFireRatesRpm?.length
        ? mode.compatibleFireRatesRpm
        : [profile.roundsPerMinute];
      const rounds = mode.consumes === "remaining" ? "remaining" : mode.roundsPerTrigger ?? 1;
      return rates.map((rate) => withTriggerMode(profile, mode.label, rate, rounds));
    }),
    unsupportedReasons: baseResult.unsupportedReasons,
  };
}

export function extractWeaponProfiles(item: Item): WeaponProfileResult {
  return extractHeatBandProfile(item)
    ?? extractModeProfiles(item)
    ?? extractCombinationProfiles(item)
    ?? extractAlternateAttackProfiles(item)
    ?? extractStandardProfiles(item);
}
