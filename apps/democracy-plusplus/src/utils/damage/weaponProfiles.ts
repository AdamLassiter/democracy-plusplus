import type { Item, PropertyValue } from "../../types";
import { parsePenetration } from "../capabilities.ts";
import { asPropertyRecord, parseCount, parseDamageValue, parseFirstNumber } from "./parse.ts";
import type { DamageComponent, WeaponProfile, WeaponProfileResult } from "./types.ts";

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
    packetsPerShot: 1,
  } satisfies DamageComponent;
}

function extractExplosionComponent(attackName: string, attack: Record<string, PropertyValue>) {
  const damage = asPropertyRecord(attack.Damage);
  const penetration = asPropertyRecord(attack.Penetration);
  const standard = parseDamageValue(damage?.["Inner Radius"]);
  const durable = parseDamageValue(damage?.["Inner Durable"]);
  const armorPenetration = parsePenetration(penetration?.["Inner AP"]);
  if (!standard || !durable || armorPenetration === null) return null;
  return {
    id: attackName,
    kind: "explosion",
    standardDamage: standard.amount,
    durableDamage: durable.amount,
    armorPenetration,
    damageType: standard.damageType,
    packetsPerShot: 1,
    radius: "inner",
  } satisfies DamageComponent;
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
      ? extractExplosionComponent(linkedExplosion.name, linkedExplosion.group)
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
    const mechanicalInterval = 60 / mechanicalRpm;
    const firingInterval = Math.max(mechanicalInterval, chargeSeconds);
    const warnings: string[] = [];
    if (item.simulation?.reload?.emptySeconds === undefined) {
      warnings.push("Sustained DPS is unavailable because the empty reload time is missing.");
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
      components,
      assumptions: [
        "Point-blank damage with no falloff",
        "Every charged projectile hits",
        `Every shot is held to the ${chargeSeconds.toFixed(2)}s source breakpoint`,
        ...(explosion ? [
          "Projectile hits and the selected part receives inner-radius explosion damage",
          "Explosion damage to other body parts is not multiplied into this result",
        ] : []),
      ],
      warnings,
    });
  }
  return profiles.length
    ? { profiles, unsupportedReasons: failures }
    : unsupported(...(failures.length ? failures : ["No source-defined charge breakpoints could be normalized."]));
}

export function extractWeaponProfiles(item: Item): WeaponProfileResult {
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
    return unsupported("The primary attack needs standard damage, durable damage, and direct penetration.");
  }
  component.packetsPerShot = pelletCount ?? 1;
  if (beam && heat) component.packetsPerShot = parseCount(heat.Beams) ?? 1;
  const arc = asPropertyRecord(attack.Arc);
  if (arc) component.packetsPerShot = parseCount(base.Barrels) ?? 1;
  const isMelee = component.damageType.toLowerCase() === "melee";
  const isSpray = item.simulation?.listedDps !== undefined && item.simulation.capacitySeconds !== undefined;
  if (roundsPerMinute === null && item.simulation?.listedDps && component.standardDamage > 0) {
    roundsPerMinute = item.simulation.listedDps
      / (component.standardDamage * component.packetsPerShot)
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
  const explosionComponent = linkedExplosion?.group
    ? extractExplosionComponent(linkedExplosion.name, linkedExplosion.group)
    : null;
  if ((projectile?.["Explode After"] || projectile?.["Explosion On Impact"]) && !explosionComponent) {
    return unsupported("The linked explosion could not be normalized.");
  }

  const warnings: string[] = [];
  if (
    !infiniteCapacity
    && item.simulation?.reload?.emptySeconds === undefined
    && item.simulation?.reload?.perRoundSeconds === undefined
  ) {
    warnings.push("Sustained DPS is unavailable because the empty reload time is missing.");
  }
  const specialEffects = asPropertyRecord(attack["Special Effects"]);
  if (specialEffects?.Status) {
    warnings.push("Applied status damage is not included in this direct-damage profile.");
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
    components: [component, ...(explosionComponent ? [explosionComponent] : [])],
    assumptions: [
      "Point-blank damage with no falloff",
      "Every shot hits",
      "Maximum listed fire rate",
      ...(pelletCount && pelletCount > 1 ? [`All ${pelletCount} pellets hit`] : []),
      ...(beam && component.packetsPerShot > 1 ? [`All ${component.packetsPerShot} beams hit`] : []),
      ...(arc && component.packetsPerShot > 1 ? [`All ${component.packetsPerShot} arcs hit the selected part`] : []),
      ...(explosionComponent ? [
        "Projectile hits and the selected part receives inner-radius explosion damage",
        "Explosion damage to other body parts is not multiplied into this result",
      ] : []),
      ...(heat ? ["Weapon fires until overheat, then replaces its heat sink; passive cooling is not included"] : []),
      ...(isSpray ? ["Listed infobox DPS is converted to source damage ticks over the documented fuel duration"] : []),
      ...(isMelee ? ["Continuous repeated swings at the listed maximum attack rate"] : []),
    ],
    warnings,
  };
  return { profiles: [profile], unsupportedReasons: [] };
}
