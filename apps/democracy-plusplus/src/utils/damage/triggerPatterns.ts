import type { WeaponProfile } from "./types.ts";

export type TriggerPayload = {
  ammoConsumed: number;
  events: Array<{ offsetSeconds: number; projectiles: number }>;
};

export function triggerPayload(
  profile: WeaponProfile,
  ammunition: number,
): TriggerPayload | null {
  const { trigger } = profile;
  if (trigger.ammoPerTrigger === "remaining") {
    const ammoConsumed = Math.max(0, Math.floor(ammunition));
    if (ammoConsumed === 0) return null;
    const interval = trigger.remainingProjectileIntervalSeconds ?? 0;
    return {
      ammoConsumed,
      events: Array.from({ length: ammoConsumed }, (_, index) => ({
        offsetSeconds: index * interval,
        projectiles: 1,
      })),
    };
  }

  if (ammunition < trigger.ammoPerTrigger) return null;
  return {
    ammoConsumed: trigger.ammoPerTrigger,
    events: trigger.projectileEvents,
  };
}

export function payloadProjectiles(payload: TriggerPayload) {
  return payload.events.reduce((total, event) => total + event.projectiles, 0);
}

export function payloadDuration(payload: TriggerPayload) {
  return payload.events.reduce((maximum, event) => Math.max(maximum, event.offsetSeconds), 0);
}
