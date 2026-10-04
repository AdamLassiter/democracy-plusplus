import type {
  DamageTrace,
  DpsValue,
  EnemyTarget,
  TargetSimulationOptions,
  TargetTtkResult,
  WeaponDpsResult,
  WeaponProfile,
} from "./types.ts";
import { resolveTargetStatuses } from "./statuses.ts";
import {
  payloadDuration,
  payloadProjectiles,
  triggerPayload,
} from "./triggerPatterns.ts";

type PartPool = Map<string, number | null>;

function partInstanceKey(partId: string, instance: number) {
  return `${partId}:${instance}`;
}

function passesExplosionVerification(
  mode: string | undefined,
  radius: "inner" | "outer",
  hasLineOfSight: boolean,
) {
  const normalized = mode?.trim().toLowerCase();
  if (normalized === "none") return true;
  if (normalized === "outer radius" && radius === "inner") return true;
  return hasLineOfSight;
}

function initialPartPools(target: EnemyTarget): PartPool {
  const pools: PartPool = new Map();
  for (const part of target.parts) {
    for (let instance = 1; instance <= part.count; instance++) {
      pools.set(partInstanceKey(part.id, instance), part.partHealth);
    }
  }
  return pools;
}

function componentsAtProjectile(
  profile: WeaponProfile,
  projectileIndex: number,
) {
  if (!profile.heatState) return profile.components;
  const heatFraction = Math.min(
    1,
    (projectileIndex * profile.heatState.heatPerProjectile) /
      profile.heatState.threshold,
  );
  return (
    [...profile.heatState.bands]
      .sort((left, right) => right.minimumFraction - left.minimumFraction)
      .find(({ minimumFraction }) => heatFraction >= minimumFraction)
      ?.components ?? profile.components
  );
}

function projectileDamage(
  profile: WeaponProfile,
  projectiles: number,
  projectileOffset = 0,
): DpsValue {
  let total: DpsValue = { standard: 0, durable: 0 };
  for (let index = 0; index < projectiles; index++) {
    total = componentsAtProjectile(
      profile,
      projectileOffset + index,
    ).reduce<DpsValue>(
      (sum, component) => ({
        standard:
          sum.standard +
          component.standardDamage * component.packetsPerProjectile,
        durable:
          sum.durable +
          component.durableDamage * component.packetsPerProjectile,
      }),
      total,
    );
  }
  return total;
}

function scaleDamage(value: DpsValue, multiplier: number): DpsValue {
  return {
    standard: value.standard * multiplier,
    durable: value.durable * multiplier,
  };
}

function addDamage(left: DpsValue, right: DpsValue): DpsValue {
  return {
    standard: left.standard + right.standard,
    durable: left.durable + right.durable,
  };
}

function statusDps(profile: WeaponProfile) {
  return profile.statuses.map((status) => {
    const damagePerSecond = {
      standard: status.damagePerSecond.standardDamage,
      durable: status.damagePerSecond.durableDamage,
    };
    return {
      id: status.id,
      label: status.label,
      strengthPerProjectile:
        status.strengthPerPacket * status.packetsPerProjectile,
      durationSeconds: status.durationSeconds,
      damagePerSecond,
      fullDurationDamage: scaleDamage(damagePerSecond, status.durationSeconds),
    };
  });
}

function maximumComponentOffset(profile: WeaponProfile) {
  return profile.components.reduce(
    (maximum, component) => Math.max(maximum, component.offsetSeconds ?? 0),
    0,
  );
}

function fullReloadSeconds(reload: WeaponProfile["reload"], capacity: number) {
  if (!reload) return undefined;
  if (reload.emptySeconds !== undefined) return reload.emptySeconds;
  if (reload.firstRoundSeconds !== undefined) {
    return (
      reload.firstRoundSeconds +
      Math.max(0, capacity - 1) *
        (reload.additionalRoundSeconds ?? reload.firstRoundSeconds)
    );
  }
  return reload.perRoundSeconds === undefined
    ? undefined
    : reload.perRoundSeconds * capacity;
}

function firstUsableReloadSeconds(reload: WeaponProfile["reload"]) {
  return (
    reload?.firstRoundSeconds ?? reload?.perRoundSeconds ?? reload?.emptySeconds
  );
}

export function calculateWeaponDps(profile: WeaponProfile): WeaponDpsResult {
  const { resource, trigger } = profile;
  const firstPayload = triggerPayload(profile, resource.capacity);
  if (!firstPayload) {
    return {
      damagePerTrigger: { standard: 0, durable: 0 },
      burstDps: { standard: 0, durable: 0 },
      magazineDamage: { standard: 0, durable: 0 },
      sustainedDps: null,
      timeToEmptySeconds: null,
      cycleSeconds: null,
      statuses: statusDps(profile),
      warnings: [
        ...profile.warnings,
        "The firing profile cannot consume its configured resource.",
      ],
    };
  }

  const damagePerProjectile = projectileDamage(profile, 1);
  const damagePerTrigger = projectileDamage(
    profile,
    payloadProjectiles(firstPayload),
  );
  const burstDps =
    trigger.ammoPerTrigger === "remaining" &&
    (trigger.remainingProjectileIntervalSeconds ?? 0) > 0
      ? scaleDamage(
          damagePerProjectile,
          1 / (trigger.remainingProjectileIntervalSeconds ?? 1),
        )
      : scaleDamage(damagePerTrigger, 1 / trigger.triggerIntervalSeconds);
  const warnings = [...profile.warnings];

  if (resource.infinite) {
    if (profile.heatState) {
      const heatCycleDamage = projectileDamage(profile, resource.capacity);
      const finalBand = profile.heatState.bands.at(-1);
      const finalDamage =
        finalBand?.components.reduce<DpsValue>(
          (total, component) => ({
            standard:
              total.standard +
              component.standardDamage * component.packetsPerProjectile,
            durable:
              total.durable +
              component.durableDamage * component.packetsPerProjectile,
          }),
          { standard: 0, durable: 0 },
        ) ?? damagePerTrigger;
      const timeToMaximumHeat =
        (trigger.cycleStartDelaySeconds ?? 0) +
        Math.max(0, resource.capacity - 1) * trigger.triggerIntervalSeconds;
      return {
        damagePerTrigger,
        burstDps: scaleDamage(finalDamage, 1 / trigger.triggerIntervalSeconds),
        magazineDamage: heatCycleDamage,
        sustainedDps: scaleDamage(
          finalDamage,
          1 / trigger.triggerIntervalSeconds,
        ),
        timeToEmptySeconds: timeToMaximumHeat,
        cycleSeconds: null,
        statuses: statusDps(profile),
        warnings: [
          ...warnings,
          "Burst and sustained DPS show the saturated final heat band; the resource total covers one cold-to-maximum heat progression.",
        ],
      };
    }
    return {
      damagePerTrigger,
      burstDps,
      magazineDamage: damagePerTrigger,
      sustainedDps: burstDps,
      timeToEmptySeconds: null,
      cycleSeconds: null,
      statuses: statusDps(profile),
      warnings,
    };
  }

  let ammunition = Math.max(0, Math.floor(resource.capacity));
  let triggerStart = trigger.cycleStartDelaySeconds ?? 0;
  let lastEventTime = triggerStart;
  let magazineDamage: DpsValue = { standard: 0, durable: 0 };
  let triggerCount = 0;

  while (triggerCount < 100_000) {
    const payload = triggerPayload(profile, ammunition);
    if (!payload) break;
    magazineDamage = addDamage(
      magazineDamage,
      projectileDamage(
        profile,
        payloadProjectiles(payload),
        resource.capacity - ammunition,
      ),
    );
    lastEventTime = Math.max(
      lastEventTime,
      triggerStart + payloadDuration(payload),
    );
    ammunition -= payload.ammoConsumed;
    triggerCount++;
    if (ammunition <= 0) break;
    triggerStart = Math.max(
      triggerStart + trigger.triggerIntervalSeconds,
      lastEventTime,
    );
  }

  if (triggerCount >= 100_000) {
    warnings.push(
      "The magazine timeline exceeded the 100,000-trigger safety limit.",
    );
  }

  const timeToEmptySeconds =
    profile.firingDurationSeconds === undefined
      ? lastEventTime + maximumComponentOffset(profile)
      : (trigger.cycleStartDelaySeconds ?? 0) + profile.firingDurationSeconds;
  const reloadSeconds = fullReloadSeconds(resource.reload, resource.capacity);
  const cycleSeconds =
    reloadSeconds === undefined ? null : timeToEmptySeconds + reloadSeconds;

  if (cycleSeconds === 0) {
    warnings.push(
      "Sustained DPS cannot be calculated from a zero-second firing cycle.",
    );
  }

  return {
    damagePerTrigger,
    burstDps,
    magazineDamage,
    sustainedDps:
      cycleSeconds && cycleSeconds > 0
        ? scaleDamage(magazineDamage, 1 / cycleSeconds)
        : null,
    timeToEmptySeconds,
    cycleSeconds,
    statuses: statusDps(profile),
    warnings,
  };
}

function armorMultiplier(armorPenetration: number, armorValue: number) {
  if (armorPenetration > armorValue) return 1;
  if (armorPenetration === armorValue) return 0.65;
  return 0;
}

function calculateHit(
  profile: WeaponProfile,
  target: EnemyTarget,
  partPools: PartPool,
  projectiles: number,
  options: TargetSimulationOptions = {},
  projectileOffset = 0,
  componentOffsetSeconds?: number,
) {
  const aimedPart = target.parts.find((part) => part.id === target.aimedPartId);
  const fallbackAimedPart = aimedPart ?? {
    id: target.aimedPartId,
    name: target.partName,
    count: 1,
    armorValue: target.armorValue,
    durability: target.durability,
    explosionResistance: target.explosionResistance,
    partHealth: target.partHealth,
    damageToMain: target.damageToMain,
    damageToMainCapped: target.damageToMainCapped,
    fatal: target.fatal,
    constitution: target.partConstitution,
  };
  const requestedScenario = options.impactScenarioId
    ? target.explosionScenarios.find(
        (candidate) => candidate.id === options.impactScenarioId,
      )
    : undefined;
  const scenario =
    requestedScenario &&
    (!requestedScenario.directHitPartId ||
      requestedScenario.directHitPartId === target.aimedPartId)
      ? requestedScenario
      : undefined;
  const remainingWithinHit = new Map(partPools);
  const damageByPart = new Map<string, number>();
  const trace: DamageTrace[] = [];
  const hitRate = Math.min(1, Math.max(0, options.hitRate ?? 1));

  const allEventComponents = profile.heatState
    ? Array.from({ length: projectiles }, (_, index) =>
        componentsAtProjectile(profile, projectileOffset + index),
      ).flat()
    : profile.components;
  const eventComponents = allEventComponents.filter(
    (component) =>
      (componentOffsetSeconds === undefined ||
        (component.offsetSeconds ?? 0) === componentOffsetSeconds) &&
      (component.minimumArmingDistanceMeters === undefined ||
        (options.distanceMeters ?? 0) >= component.minimumArmingDistanceMeters),
  );
  const componentProjectiles = profile.heatState ? 1 : projectiles;
  for (const component of eventComponents) {
    const affected =
      component.kind === "explosion" && scenario
        ? scenario.affectedParts.flatMap((affectedPart) => {
            const normalizedPart = target.parts.find(
              (part) => part.id === affectedPart.partId,
            );
            if (!normalizedPart) return [];
            if (
              !passesExplosionVerification(
                normalizedPart.explosionVerificationMode,
                affectedPart.radius,
                affectedPart.lineOfSight,
              )
            )
              return [];
            const instances = Math.min(
              normalizedPart.count,
              affectedPart.instances,
            );
            return Array.from({ length: instances }, (_, index) => ({
              part: normalizedPart,
              instance: index + 1,
              damageFraction:
                affectedPart.radius === "inner"
                  ? 1
                  : (affectedPart.damageFraction ?? 0),
            }));
          })
        : [{ part: fallbackAimedPart, instance: 1, damageFraction: 1 }];

    for (const { part, instance, damageFraction } of affected) {
      const key = partInstanceKey(part.id, instance);
      const durability = component.kind === "explosion" ? 1 : part.durability;
      const scenarioPart =
        component.kind === "explosion" && scenario
          ? scenario.affectedParts.find(
              (candidate) => candidate.partId === part.id,
            )
          : undefined;
      const outer =
        scenarioPart?.radius === "outer" ? component.outer : undefined;
      if (scenarioPart?.radius === "outer" && !outer) continue;
      const standardDamage = outer?.standardDamage ?? component.standardDamage;
      const durableDamage = outer?.durableDamage ?? component.durableDamage;
      const componentArmorPenetration =
        outer?.armorPenetration ?? component.armorPenetration;
      const blendedDamage =
        standardDamage * (1 - durability) + durableDamage * durability;
      const penetrationMultiplier = armorMultiplier(
        componentArmorPenetration,
        part.armorValue,
      );
      const explosionMultiplier =
        component.kind === "explosion" ? 1 - part.explosionResistance : 1;
      const damagePerPacket = Math.floor(
        blendedDamage *
          penetrationMultiplier *
          explosionMultiplier *
          damageFraction,
      );
      const packets = component.packetsPerProjectile * componentProjectiles;
      const partDamage = damagePerPacket * packets * hitRate;
      const remainingForCap = remainingWithinHit.get(key) ?? null;
      const transferable =
        remainingForCap === null || !part.damageToMainCapped
          ? partDamage
          : Math.min(partDamage, Math.max(0, remainingForCap));
      const mainDamage =
        remainingForCap === null
          ? Math.floor(partDamage * part.damageToMain)
          : Math.floor(transferable * part.damageToMain);
      if (remainingForCap !== null)
        remainingWithinHit.set(key, remainingForCap - partDamage);
      damageByPart.set(key, (damageByPart.get(key) ?? 0) + partDamage);
      trace.push({
        componentId: component.id,
        targetPartId: part.id,
        targetPartName: part.name,
        targetPartInstance: instance,
        rawStandard: standardDamage,
        rawDurable: durableDamage,
        durability,
        blendedDamage,
        armorMultiplier: penetrationMultiplier,
        explosionMultiplier,
        damagePerPacket,
        packets,
        partDamage,
        mainDamage,
        ...(component.offsetSeconds === undefined
          ? {}
          : { eventOffsetSeconds: component.offsetSeconds }),
      });
    }

    if (component.kind === "explosion" && scenario) {
      const componentTrace = trace.filter(
        (entry) => entry.componentId === component.id,
      );
      const alreadyDamagedMain = componentTrace.some(
        (entry) => entry.mainDamage > 0,
      );
      const redirect = !alreadyDamagedMain
        ? scenario.affectedParts.find((affectedPart) => {
            const part = target.parts.find(
              (candidate) => candidate.id === affectedPart.partId,
            );
            const penetration =
              affectedPart.radius === "outer"
                ? component.outer?.armorPenetration
                : component.armorPenetration;
            return (
              passesExplosionVerification(
                part?.explosionVerificationMode,
                affectedPart.radius,
                affectedPart.lineOfSight,
              ) &&
              part?.explosionResistance === 1 &&
              penetration !== undefined &&
              penetration >= target.mainArmorValue
            );
          })
        : undefined;
      if (redirect) {
        const outer = redirect.radius === "outer" ? component.outer : undefined;
        const standardDamage =
          outer?.standardDamage ?? component.standardDamage;
        const durableDamage = outer?.durableDamage ?? component.durableDamage;
        const penetration =
          outer?.armorPenetration ?? component.armorPenetration;
        const fraction =
          redirect.radius === "inner" ? 1 : (redirect.damageFraction ?? 0);
        const blendedDamage = durableDamage;
        const penetrationMultiplier = armorMultiplier(
          penetration,
          target.mainArmorValue,
        );
        const damagePerPacket = Math.floor(
          blendedDamage * penetrationMultiplier * fraction,
        );
        const packets = component.packetsPerProjectile * componentProjectiles;
        const mainDamage = damagePerPacket * packets * hitRate;
        trace.push({
          componentId: `${component.id} (Affected by Explosion)`,
          targetPartId: "main",
          targetPartName: "Main",
          targetPartInstance: 1,
          rawStandard: standardDamage,
          rawDurable: durableDamage,
          durability: 1,
          blendedDamage,
          armorMultiplier: penetrationMultiplier,
          explosionMultiplier: 1,
          damagePerPacket,
          packets,
          partDamage: 0,
          mainDamage,
          ...(component.offsetSeconds === undefined
            ? {}
            : { eventOffsetSeconds: component.offsetSeconds }),
        });
      }
    }
  }
  return {
    trace,
    partDamage: trace.reduce(
      (total, component) => total + component.partDamage,
      0,
    ),
    mainDamage: trace.reduce(
      (total, component) => total + component.mainDamage,
      0,
    ),
    damageByPart,
  };
}

function result(
  base: Omit<
    TargetTtkResult,
    | "damagePerTrigger"
    | "trace"
    | "warnings"
    | "roundsConsumed"
    | "statusDamageToMain"
  >,
  firstTrigger: ReturnType<typeof calculateHit>,
  warnings: string[],
  roundsConsumed: number,
  statusDamageToMain = 0,
): TargetTtkResult {
  return {
    ...base,
    damagePerTrigger: {
      part: firstTrigger.partDamage,
      main: firstTrigger.mainDamage,
    },
    trace: firstTrigger.trace,
    warnings,
    roundsConsumed,
    statusDamageToMain,
  };
}

export function simulateTargetTtk(
  profile: WeaponProfile,
  target: EnemyTarget,
  options: TargetSimulationOptions = {},
): TargetTtkResult {
  const { resource, trigger } = profile;
  const startingAmmunition = resource.infinite
    ? Number.POSITIVE_INFINITY
    : Math.min(
        resource.capacity,
        Math.max(
          0,
          Math.floor(options.startingAmmunition ?? resource.capacity),
        ),
      );
  const initialPayload = triggerPayload(profile, startingAmmunition);
  const initialProjectiles = initialPayload
    ? payloadProjectiles(initialPayload)
    : 0;
  const startingPartPools = initialPartPools(target);
  const firstTrigger = calculateHit(
    profile,
    target,
    startingPartPools,
    initialProjectiles,
    options,
  );
  const warnings = [...profile.warnings];
  let roundsConsumed = 0;
  let statusDamageToMain = 0;
  const minimumArmingDistance = profile.components.reduce<number | null>(
    (minimum, component) => {
      if (component.minimumArmingDistanceMeters === undefined) return minimum;
      return minimum === null
        ? component.minimumArmingDistanceMeters
        : Math.min(minimum, component.minimumArmingDistanceMeters);
    },
    null,
  );
  if (
    minimumArmingDistance !== null &&
    (options.distanceMeters ?? 0) < minimumArmingDistance
  ) {
    warnings.push(
      `Explosion damage is excluded at ${options.distanceMeters ?? 0}m; this projectile arms at ${minimumArmingDistance}m.`,
    );
  }
  const hitRate = Math.min(1, Math.max(0, options.hitRate ?? 1));
  if (hitRate < 1)
    warnings.push(
      `Expected-value estimate using a ${Math.round(hitRate * 100)}% hit rate.`,
    );
  const resolvedStatuses = resolveTargetStatuses(profile, target);
  for (const status of profile.statuses) {
    const threshold = target.statusThresholds[status.id];
    const multiplier =
      target.elementalMultipliers[
        status.damagePerSecond
          .damageType as keyof typeof target.elementalMultipliers
      ];
    if (!threshold) {
      warnings.push(
        `${status.label} damage is excluded from combined TTK because this enemy has no guaranteed buildup threshold.`,
      );
    } else if (multiplier === undefined) {
      warnings.push(
        `${status.label} damage is excluded from combined TTK because this enemy has no ${status.damagePerSecond.damageType} multiplier.`,
      );
    }
  }
  const requestedScenario = options.impactScenarioId
    ? target.explosionScenarios.find(
        (scenario) => scenario.id === options.impactScenarioId,
      )
    : undefined;
  if (options.impactScenarioId && !requestedScenario) {
    warnings.push(
      "The selected impact scenario is not available for this enemy anatomy; using the aimed part only.",
    );
  } else if (
    requestedScenario?.directHitPartId &&
    requestedScenario.directHitPartId !== target.aimedPartId
  ) {
    warnings.push(
      "The selected impact scenario does not match the aimed body part; using the aimed part only.",
    );
  } else if (requestedScenario?.note) {
    warnings.push(requestedScenario.note);
  } else if (
    !options.impactScenarioId &&
    profile.components.some(({ kind }) => kind === "explosion")
  ) {
    warnings.push(
      "Single-part explosion estimate; select a sourced or curated impact scenario when one is available.",
    );
  }

  const canDealResolvedStatusDamage = resolvedStatuses.some(
    ({ damagePerSecond }) => damagePerSecond > 0,
  );
  if (
    !initialPayload ||
    (firstTrigger.partDamage <= 0 &&
      firstTrigger.mainDamage <= 0 &&
      !canDealResolvedStatusDamage)
  ) {
    return result(
      {
        status: "no-damage",
        timeToKillSeconds: null,
        timeToDownSeconds: null,
        bleedoutSeconds: null,
        shots: 0,
        reloads: 0,
        killCondition: null,
      },
      firstTrigger,
      [
        ...warnings,
        initialPayload
          ? "Every enabled damage component is blocked by armor or resistance."
          : "The firing profile cannot consume its configured resource.",
      ],
      roundsConsumed,
      statusDamageToMain,
    );
  }

  let mainRemaining = target.mainHealth;
  const partPools = initialPartPools(target);
  let constitutionRemaining: number | null = null;
  let activeConstitution: { health: number; decayPerSecond: number } | null =
    null;
  let constitutionSource: "main" | "part" | null = null;
  let constitutionPartKey: string | null = null;
  let timeToDownSeconds: number | null = null;
  let lastEventTime = 0;
  let triggerStart = trigger.cycleStartDelaySeconds ?? 0;
  let ammunition = startingAmmunition;
  let shots = 0;
  let projectilesFired = 0;
  let reloads = 0;
  const statusStates = new Map(
    resolvedStatuses.map((status) => [
      status.id,
      {
        definition: status,
        buildup: 0,
        activeUntil: null as number | null,
      },
    ]),
  );

  function activeStatusDps(atTime: number) {
    return [...statusStates.values()].reduce(
      (total, state) =>
        state.activeUntil !== null && state.activeUntil > atTime
          ? total + state.definition.damagePerSecond
          : total,
      0,
    );
  }

  function nextStatusExpiry(after: number, before: number) {
    const expiries = [...statusStates.values()]
      .map(({ activeUntil }) => activeUntil)
      .filter(
        (expiry): expiry is number =>
          expiry !== null && expiry > after && expiry < before,
      );
    return expiries.length ? Math.min(...expiries) : before;
  }

  function passiveDeathBefore(eventTime: number) {
    while (lastEventTime < eventTime) {
      const boundary = nextStatusExpiry(lastEventTime, eventTime);
      const elapsed = boundary - lastEventTime;
      const statusDps = activeStatusDps(lastEventTime);

      if (
        constitutionRemaining === null &&
        mainRemaining > 0 &&
        statusDps > 0
      ) {
        const timeToMainDown = mainRemaining / statusDps;
        if (timeToMainDown <= elapsed) {
          statusDamageToMain += mainRemaining;
          lastEventTime += timeToMainDown;
          mainRemaining = 0;
          timeToDownSeconds ??= lastEventTime;
          activeConstitution = target.mainConstitution;
          constitutionSource = "main";
          constitutionPartKey = null;
          if (!activeConstitution) return lastEventTime;
          constitutionRemaining = activeConstitution.health;
          continue;
        }
        statusDamageToMain += statusDps * elapsed;
        mainRemaining -= statusDps * elapsed;
      } else if (constitutionRemaining !== null && activeConstitution) {
        const statusConstitutionDps =
          constitutionSource === "main" ? statusDps : 0;
        const passiveDps =
          activeConstitution.decayPerSecond + statusConstitutionDps;
        if (passiveDps > 0) {
          const timeToPassiveDeath = constitutionRemaining / passiveDps;
          if (timeToPassiveDeath <= elapsed) {
            statusDamageToMain +=
              (constitutionRemaining * statusConstitutionDps) / passiveDps;
            return lastEventTime + timeToPassiveDeath;
          }
          statusDamageToMain += statusConstitutionDps * elapsed;
          constitutionRemaining -= passiveDps * elapsed;
        }
      }
      lastEventTime = boundary;
    }
    return null;
  }

  for (let triggerNumber = 0; triggerNumber < 100_000; triggerNumber++) {
    let payload = triggerPayload(profile, ammunition);
    if (!payload) {
      const reloadSeconds = firstUsableReloadSeconds(resource.reload);
      if (resource.infinite || reloadSeconds === undefined) {
        return result(
          {
            status: "unsupported",
            timeToKillSeconds: null,
            timeToDownSeconds,
            bleedoutSeconds: null,
            shots,
            reloads,
            killCondition: null,
          },
          firstTrigger,
          [
            ...warnings,
            "The target survives one resource cycle, but no reload timing is available.",
          ],
          roundsConsumed,
          statusDamageToMain,
        );
      }
      const reloadEnds = Math.max(triggerStart, lastEventTime) + reloadSeconds;
      const passiveDeath = passiveDeathBefore(reloadEnds);
      if (passiveDeath !== null) {
        return result(
          {
            status: "killed",
            timeToKillSeconds: passiveDeath,
            timeToDownSeconds,
            bleedoutSeconds:
              timeToDownSeconds === null
                ? null
                : passiveDeath - timeToDownSeconds,
            shots,
            reloads,
            killCondition: "bleedout",
          },
          firstTrigger,
          warnings,
          roundsConsumed,
          statusDamageToMain,
        );
      }
      ammunition =
        resource.reload?.perRoundSeconds === undefined &&
        resource.reload?.firstRoundSeconds === undefined
          ? resource.capacity
          : 1;
      reloads++;
      triggerStart = reloadEnds + (trigger.cycleStartDelaySeconds ?? 0);
      payload = triggerPayload(profile, ammunition);
      if (!payload) break;
    }

    const componentOffsets = profile.components.length
      ? [
          ...new Set(
            profile.components.map(({ offsetSeconds }) => offsetSeconds ?? 0),
          ),
        ]
      : [0];
    const events = payload.events
      .flatMap((event) =>
        componentOffsets.map((componentOffsetSeconds) => ({
          offsetSeconds: event.offsetSeconds + componentOffsetSeconds,
          projectileOffsetSeconds: event.offsetSeconds,
          componentOffsetSeconds,
          projectiles: event.projectiles,
        })),
      )
      .sort((left, right) => left.offsetSeconds - right.offsetSeconds);
    let triggerCommitted = false;

    for (const event of events) {
      const eventTime = triggerStart + event.offsetSeconds;
      const passiveDeath = passiveDeathBefore(eventTime);
      if (passiveDeath !== null) {
        return result(
          {
            status: "killed",
            timeToKillSeconds: passiveDeath,
            timeToDownSeconds,
            bleedoutSeconds:
              timeToDownSeconds === null
                ? null
                : passiveDeath - timeToDownSeconds,
            shots,
            reloads,
            killCondition: "bleedout",
          },
          firstTrigger,
          warnings,
          roundsConsumed,
          statusDamageToMain,
        );
      }

      if (!triggerCommitted) {
        shots++;
        roundsConsumed += payload.ammoConsumed;
        ammunition -= payload.ammoConsumed;
        triggerCommitted = true;
      }

      const hit = calculateHit(
        profile,
        target,
        partPools,
        event.projectiles,
        options,
        projectilesFired,
        event.componentOffsetSeconds,
      );
      if (event.componentOffsetSeconds === 0)
        projectilesFired += event.projectiles;
      for (const [key, damage] of hit.damageByPart) {
        const remaining = partPools.get(key);
        if (remaining !== null && remaining !== undefined)
          partPools.set(key, remaining - damage);
      }
      if (constitutionRemaining !== null) {
        constitutionRemaining -=
          constitutionSource === "part" && constitutionPartKey
            ? (hit.damageByPart.get(constitutionPartKey) ?? 0)
            : hit.mainDamage;
      } else {
        mainRemaining -= hit.mainDamage;
      }

      if (constitutionRemaining !== null && constitutionRemaining <= 0) {
        return result(
          {
            status: "killed",
            timeToKillSeconds: eventTime,
            timeToDownSeconds,
            bleedoutSeconds:
              timeToDownSeconds === null ? null : eventTime - timeToDownSeconds,
            shots,
            reloads,
            killCondition: "bleedout",
          },
          firstTrigger,
          warnings,
          roundsConsumed,
          statusDamageToMain,
        );
      }

      for (const state of event.componentOffsetSeconds === 0
        ? statusStates.values()
        : []) {
        const applicationStrength =
          state.definition.strengthPerProjectile * event.projectiles * hitRate;
        if (state.activeUntil !== null && state.activeUntil > eventTime) {
          state.activeUntil = eventTime + state.definition.durationSeconds;
        } else {
          state.buildup += applicationStrength;
          if (state.buildup >= state.definition.guaranteedThreshold) {
            state.buildup = 0;
            state.activeUntil = eventTime + state.definition.durationSeconds;
          }
        }
      }

      const destroyedFatalPart = target.parts
        .flatMap((part) =>
          Array.from({ length: part.count }, (_, index) => ({
            part,
            key: partInstanceKey(part.id, index + 1),
          })),
        )
        .find(
          ({ part, key }) =>
            part.partHealth !== null &&
            part.fatal &&
            (partPools.get(key) ?? 1) <= 0,
        );
      const fatalPartDestroyed = destroyedFatalPart !== undefined;
      const mainDepleted = mainRemaining <= 0;
      if ((fatalPartDestroyed || mainDepleted) && timeToDownSeconds === null) {
        activeConstitution = fatalPartDestroyed
          ? (destroyedFatalPart.part.constitution ?? target.mainConstitution)
          : target.mainConstitution;
        constitutionSource =
          fatalPartDestroyed && destroyedFatalPart.part.constitution
            ? "part"
            : "main";
        constitutionPartKey =
          constitutionSource === "part"
            ? (destroyedFatalPart?.key ?? null)
            : null;
        if (!activeConstitution) {
          return result(
            {
              status: "killed",
              timeToKillSeconds: eventTime,
              timeToDownSeconds: eventTime,
              bleedoutSeconds: null,
              shots,
              reloads,
              killCondition: fatalPartDestroyed
                ? "fatal-part-destroyed"
                : "main-depleted",
            },
            firstTrigger,
            warnings,
            roundsConsumed,
            statusDamageToMain,
          );
        }
        timeToDownSeconds = eventTime;
        const overkill =
          constitutionSource === "part"
            ? Math.max(0, -(partPools.get(constitutionPartKey ?? "") ?? 0))
            : mainDepleted
              ? Math.max(0, -mainRemaining)
              : 0;
        constitutionRemaining = Math.max(
          0,
          activeConstitution.health - overkill,
        );
        if (constitutionRemaining <= 0) {
          return result(
            {
              status: "killed",
              timeToKillSeconds: eventTime,
              timeToDownSeconds,
              bleedoutSeconds: 0,
              shots,
              reloads,
              killCondition: "bleedout",
            },
            firstTrigger,
            warnings,
            roundsConsumed,
            statusDamageToMain,
          );
        }
      }

      const aimedPartKey = partInstanceKey(target.aimedPartId, 1);
      if (
        target.partHealth !== null &&
        (partPools.get(aimedPartKey) ?? 1) <= 0 &&
        !target.fatal &&
        mainRemaining > 0
      ) {
        return result(
          {
            status: "part-destroyed",
            timeToKillSeconds: null,
            timeToDownSeconds,
            bleedoutSeconds: null,
            shots,
            reloads,
            killCondition: null,
          },
          firstTrigger,
          [
            ...warnings,
            "The selected non-fatal part is destroyed before the enemy dies.",
          ],
          roundsConsumed,
          statusDamageToMain,
        );
      }
    }

    if (!triggerCommitted) break;

    const eventEnd =
      triggerStart + payloadDuration(payload) + maximumComponentOffset(profile);
    triggerStart =
      ammunition <= 0
        ? eventEnd
        : Math.max(triggerStart + trigger.triggerIntervalSeconds, eventEnd);
  }

  return result(
    {
      status: "unsupported",
      timeToKillSeconds: null,
      timeToDownSeconds,
      bleedoutSeconds: null,
      shots,
      reloads,
      killCondition: null,
    },
    firstTrigger,
    [...warnings, "Simulation exceeded the 100,000-trigger safety limit."],
    roundsConsumed,
    statusDamageToMain,
  );
}
