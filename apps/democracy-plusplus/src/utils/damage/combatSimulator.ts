import { calculateWeaponDps, simulateTargetTtk } from "./simulator.ts";
import { profileForExposure } from "./stratagemProfiles.ts";
import type {
  CombatSourceProfile,
  DpsValue,
  EnemyTarget,
  StratagemSimulationResult,
  TargetExposureScenario,
  TargetSimulationOptions,
} from "./types.ts";

function scale(value: DpsValue, multiplier: number): DpsValue {
  return { standard: value.standard * multiplier, durable: value.durable * multiplier };
}

export function simulateStratagemDeployment(
  profile: CombatSourceProfile,
  exposure: TargetExposureScenario,
  target?: EnemyTarget | null,
  options: TargetSimulationOptions = {},
): StratagemSimulationResult {
  const perPayloadProfile = profileForExposure(profile, {
    id: "per-payload",
    label: "1 payload",
    payloadHits: 1,
    confidence: "sourced",
  });
  const exposedProfile = profileForExposure(profile, exposure);
  const perPayload = calculateWeaponDps(perPayloadProfile).damagePerTrigger;
  const selectedDamage = calculateWeaponDps(exposedProfile).damagePerTrigger;
  const areaOutput = scale(perPayload, profile.delivery.totalPayloads);
  const activeWindowSeconds = profile.delivery.activeDurationSeconds ?? null;
  const cooldownSeconds = profile.delivery.cooldownSeconds ?? null;
  const rearmSeconds = profile.delivery.rearmSeconds ?? null;
  const uses = typeof profile.delivery.uses === "number" ? profile.delivery.uses : 1;
  const stockCycleSeconds = rearmSeconds === null
    ? null
    : rearmSeconds + Math.max(0, uses - 1) * (cooldownSeconds ?? 0);
  const ttk = target ? simulateTargetTtk(exposedProfile, target, options) : null;
  const kills = !target ? null : ttk?.status === "killed";
  const onTargetKillSeconds = ttk?.status === "killed" ? ttk.timeToKillSeconds : null;
  const activationDelay = profile.delivery.activationDelaySeconds ?? null;
  return {
    perPayload,
    selectedTarget: { exposure, damage: selectedDamage, ttk, kills },
    deployment: {
      payloadCount: profile.delivery.totalPayloads,
      areaOutput,
      activeWindowSeconds,
      activeWindowDps: activeWindowSeconds && activeWindowSeconds > 0
        ? scale(areaOutput, 1 / activeWindowSeconds)
        : null,
    },
    timing: {
      activationToFirstPayloadSeconds: activationDelay,
      onTargetKillSeconds,
      requestToKillSeconds: onTargetKillSeconds === null || activationDelay === null
        ? null
        : activationDelay + onTargetKillSeconds,
      cooldownSeconds,
      rearmSeconds,
      cooldownAmortizedThroughput: cooldownSeconds && cooldownSeconds > 0
        ? scale(areaOutput, 1 / cooldownSeconds)
        : null,
      rearmAmortizedThroughput: stockCycleSeconds && stockCycleSeconds > 0
        ? scale(areaOutput, uses / stockCycleSeconds)
        : null,
    },
    assumptions: [...profile.assumptions, ...profile.delivery.assumptions],
    warnings: [
      ...profile.warnings,
      ...(exposure.confidence === "estimated" ? ["Target exposure is an explicitly estimated scenario."] : []),
      ...(activeWindowSeconds === null ? ["Active-window DPS is unavailable because payload timing is incomplete."] : []),
    ],
  };
}
