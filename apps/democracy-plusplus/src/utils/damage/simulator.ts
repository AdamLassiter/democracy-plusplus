import type {
  DamageTrace,
  DpsValue,
  EnemyTarget,
  TargetSimulationOptions,
  TargetTtkResult,
  WeaponDpsResult,
  WeaponProfile,
} from "./types.ts";

function componentDamage(profile: WeaponProfile): DpsValue {
  return profile.components.reduce<DpsValue>((total, component) => ({
    standard: total.standard + component.standardDamage * component.packetsPerShot,
    durable: total.durable + component.durableDamage * component.packetsPerShot,
  }), { standard: 0, durable: 0 });
}

function scaleDamage(value: DpsValue, multiplier: number): DpsValue {
  return {
    standard: value.standard * multiplier,
    durable: value.durable * multiplier,
  };
}

export function calculateWeaponDps(profile: WeaponProfile): WeaponDpsResult {
  const damagePerTrigger = componentDamage(profile);
  const roundsPerSecond = profile.roundsPerMinute / 60;
  const shotInterval = 1 / roundsPerSecond;
  const timeToEmptySeconds = profile.infiniteCapacity
    ? null
    : profile.firingDurationSeconds ?? Math.max(0, profile.capacity - 1) * shotInterval;
  const magazineDamage = scaleDamage(damagePerTrigger, profile.capacity);
  const burstDps = scaleDamage(damagePerTrigger, roundsPerSecond);
  const reloadSeconds = profile.reload?.emptySeconds
    ?? (profile.reload?.perRoundSeconds === undefined
      ? undefined
      : profile.reload.perRoundSeconds * profile.capacity);
  const cycleSeconds = profile.infiniteCapacity || reloadSeconds === undefined || timeToEmptySeconds === null
    ? null
    : (profile.warmupSeconds ?? 0) + timeToEmptySeconds + reloadSeconds;
  const warnings = [...profile.warnings];

  if (cycleSeconds === 0) {
    warnings.push("Sustained DPS cannot be calculated from a zero-second firing cycle.");
  }

  return {
    damagePerTrigger,
    burstDps,
    magazineDamage,
    sustainedDps: profile.infiniteCapacity
      ? burstDps
      : cycleSeconds && cycleSeconds > 0
        ? scaleDamage(magazineDamage, 1 / cycleSeconds)
        : null,
    timeToEmptySeconds,
    cycleSeconds,
    warnings,
  };
}

function armorMultiplier(armorPenetration: number, armorValue: number) {
  if (armorPenetration > armorValue) return 1;
  if (armorPenetration === armorValue) return 0.65;
  return 0;
}

function calculateShot(
  profile: WeaponProfile,
  target: EnemyTarget,
  partRemaining: number | null,
  options: TargetSimulationOptions = {},
) {
  let remainingForCap = partRemaining;
  const trace: DamageTrace[] = profile.components.map((component) => {
    const durability = component.kind === "explosion" ? 1 : target.durability;
    const blendedDamage = component.standardDamage * (1 - durability)
      + component.durableDamage * durability;
    const penetrationMultiplier = armorMultiplier(component.armorPenetration, target.armorValue);
    const explosionMultiplier = component.kind === "explosion"
      ? 1 - target.explosionResistance
      : 1;
    const damagePerPacket = Math.floor(blendedDamage * penetrationMultiplier * explosionMultiplier);
    const hitRate = Math.min(1, Math.max(0, options.hitRate ?? 1));
    const partDamage = damagePerPacket * component.packetsPerShot * hitRate;
    const transferable = remainingForCap === null || !target.damageToMainCapped
      ? partDamage
      : Math.min(partDamage, Math.max(0, remainingForCap));
    const mainDamage = remainingForCap === null
      ? Math.floor(partDamage * target.damageToMain)
      : Math.floor(transferable * target.damageToMain);
    if (remainingForCap !== null) remainingForCap -= partDamage;
    return {
      componentId: component.id,
      rawStandard: component.standardDamage,
      rawDurable: component.durableDamage,
      durability,
      blendedDamage,
      armorMultiplier: penetrationMultiplier,
      explosionMultiplier,
      damagePerPacket,
      packets: component.packetsPerShot,
      partDamage,
      mainDamage,
    };
  });
  return {
    trace,
    partDamage: trace.reduce((total, component) => total + component.partDamage, 0),
    mainDamage: trace.reduce((total, component) => total + component.mainDamage, 0),
  };
}

export function simulateTargetTtk(
  profile: WeaponProfile,
  target: EnemyTarget,
  options: TargetSimulationOptions = {},
): TargetTtkResult {
  let mainRemaining = target.mainHealth;
  let partRemaining = target.partHealth;
  let constitutionRemaining: number | null = null;
  let activeConstitution: { health: number; decayPerSecond: number } | null = null;
  let constitutionSource: "main" | "part" | null = null;
  let timeToDownSeconds: number | null = null;
  let time = profile.warmupSeconds ?? 0;
  let shots = 0;
  let reloads = 0;
  let shotsInMagazine = 0;
  const magazineSize = profile.infiniteCapacity ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(profile.capacity));
  const shotInterval = 60 / profile.roundsPerMinute;
  const firstShot = calculateShot(profile, target, partRemaining, options);
  const warnings = [...profile.warnings];
  const hitRate = Math.min(1, Math.max(0, options.hitRate ?? 1));
  if (hitRate < 1) warnings.push(`Expected-value estimate using a ${Math.round(hitRate * 100)}% hit rate.`);

  if (firstShot.partDamage <= 0 && firstShot.mainDamage <= 0) {
    return {
      status: "no-damage",
      timeToKillSeconds: null,
      timeToDownSeconds: null,
      bleedoutSeconds: null,
      shots: 0,
      reloads: 0,
      killCondition: null,
      damagePerTrigger: { part: 0, main: 0 },
      trace: firstShot.trace,
      warnings: [...warnings, "Every enabled damage component is blocked by armor or resistance."],
    };
  }

  for (let event = 0; event < 100_000; event++) {
    const shot = calculateShot(profile, target, partRemaining, options);
    shots++;
    shotsInMagazine++;
    if (partRemaining !== null) partRemaining -= shot.partDamage;

    if (constitutionRemaining !== null) {
      constitutionRemaining -= constitutionSource === "part" ? shot.partDamage : shot.mainDamage;
    } else {
      mainRemaining -= shot.mainDamage;
    }

    if (constitutionRemaining !== null && constitutionRemaining <= 0) {
      return {
        status: "killed",
        timeToKillSeconds: time,
        timeToDownSeconds,
        bleedoutSeconds: timeToDownSeconds === null ? null : time - timeToDownSeconds,
        shots,
        reloads,
        killCondition: "bleedout",
        damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
        trace: firstShot.trace,
        warnings,
      };
    }

    const fatalPartDestroyed = target.partHealth !== null && target.fatal && (partRemaining ?? 1) <= 0;
    const mainDepleted = mainRemaining <= 0;
    if ((fatalPartDestroyed || mainDepleted) && timeToDownSeconds === null) {
      activeConstitution = fatalPartDestroyed
        ? target.partConstitution ?? target.mainConstitution
        : target.mainConstitution;
      constitutionSource = fatalPartDestroyed && target.partConstitution ? "part" : "main";
      if (!activeConstitution) {
        return {
          status: "killed",
          timeToKillSeconds: time,
          timeToDownSeconds: time,
          bleedoutSeconds: null,
          shots,
          reloads,
          killCondition: fatalPartDestroyed ? "fatal-part-destroyed" : "main-depleted",
          damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
          trace: firstShot.trace,
          warnings,
        };
      }
      timeToDownSeconds = time;
      const overkill = constitutionSource === "part"
        ? Math.max(0, -(partRemaining ?? 0))
        : mainDepleted ? Math.max(0, -mainRemaining) : 0;
      constitutionRemaining = Math.max(0, activeConstitution.health - overkill);
      if (constitutionRemaining <= 0) {
        return {
          status: "killed",
          timeToKillSeconds: time,
          timeToDownSeconds,
          bleedoutSeconds: 0,
          shots,
          reloads,
          killCondition: "bleedout",
          damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
          trace: firstShot.trace,
          warnings,
        };
      }
    }

    if (target.partHealth !== null && (partRemaining ?? 1) <= 0 && !target.fatal && mainRemaining > 0) {
      return {
        status: "part-destroyed",
        timeToKillSeconds: null,
        timeToDownSeconds,
        bleedoutSeconds: null,
        shots,
        reloads,
        killCondition: null,
        damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
        trace: firstShot.trace,
        warnings: [...warnings, "The selected non-fatal part is destroyed before the enemy dies."],
      };
    }

    let delay: number;
    if (shotsInMagazine < magazineSize) {
      delay = shotInterval;
    } else {
      const reloadSeconds = profile.reload?.emptySeconds ?? profile.reload?.perRoundSeconds;
      if (reloadSeconds === undefined) {
        return {
          status: "unsupported",
          timeToKillSeconds: null,
          timeToDownSeconds,
          bleedoutSeconds: null,
          shots,
          reloads,
          killCondition: null,
          damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
          trace: firstShot.trace,
          warnings: [...warnings, "The target survives one magazine, but no reload timing is available."],
        };
      }
      delay = reloadSeconds + (profile.warmupSeconds ?? 0);
      shotsInMagazine = 0;
      reloads++;
    }

    if (constitutionRemaining !== null && activeConstitution && activeConstitution.decayPerSecond > 0) {
      const timeToPassiveDeath = constitutionRemaining / activeConstitution.decayPerSecond;
      if (timeToPassiveDeath <= delay) {
        const deathTime = time + timeToPassiveDeath;
        return {
          status: "killed",
          timeToKillSeconds: deathTime,
          timeToDownSeconds,
          bleedoutSeconds: timeToDownSeconds === null ? null : deathTime - timeToDownSeconds,
          shots,
          reloads,
          killCondition: "bleedout",
          damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
          trace: firstShot.trace,
          warnings,
        };
      }
      constitutionRemaining -= delay * activeConstitution.decayPerSecond;
    }
    time += delay;
  }

  return {
    status: "unsupported",
    timeToKillSeconds: null,
    timeToDownSeconds,
    bleedoutSeconds: null,
    shots,
    reloads,
    killCondition: null,
    damagePerTrigger: { part: firstShot.partDamage, main: firstShot.mainDamage },
    trace: firstShot.trace,
    warnings: [...warnings, "Simulation exceeded the 100,000-shot safety limit."],
  };
}
