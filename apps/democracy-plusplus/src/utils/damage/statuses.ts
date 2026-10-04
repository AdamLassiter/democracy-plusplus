import type { EnemyTarget, WeaponProfile } from "./types.ts";

function armorMultiplier(armorPenetration: number, armorValue: number) {
  if (armorPenetration > armorValue) return 1;
  if (armorPenetration === armorValue) return 0.65;
  return 0;
}

export type ResolvedStatus = {
  id: string;
  label: string;
  strengthPerProjectile: number;
  guaranteedThreshold: number;
  durationSeconds: number;
  damagePerSecond: number;
};

export function resolveTargetStatuses(profile: WeaponProfile, target: EnemyTarget) {
  return profile.statuses.flatMap<ResolvedStatus>((status) => {
    const threshold = target.statusThresholds[status.id];
    const damageType = status.damagePerSecond.damageType as keyof typeof target.elementalMultipliers;
    const multiplier = target.elementalMultipliers[damageType];
    if (!threshold || multiplier === undefined) return [];
    return [{
      id: status.id,
      label: status.label,
      strengthPerProjectile: status.strengthPerPacket * status.packetsPerProjectile,
      guaranteedThreshold: threshold.guaranteed,
      durationSeconds: status.durationSeconds,
      damagePerSecond: Math.floor(
        status.damagePerSecond.standardDamage
        * multiplier
        * armorMultiplier(status.damagePerSecond.armorPenetration, target.mainArmorValue),
      ),
    }];
  });
}
