import type { WeaponSimulationMetadata } from "../../types";

export type DamageComponent = {
  id: string;
  kind: "direct" | "explosion" | "status";
  standardDamage: number;
  durableDamage: number;
  armorPenetration: number;
  damageType: string;
  packetsPerShot: number;
  radius?: "inner" | "outer";
};

export type WeaponProfile = {
  id: string;
  itemDisplayName: string;
  label: string;
  kind: "projectile" | "shotgun" | "beam" | "heat-projectile" | "arc" | "spray" | "melee" | "charge";
  roundsPerMinute: number;
  capacity: number;
  infiniteCapacity?: boolean;
  firingDurationSeconds?: number;
  warmupSeconds?: number;
  chargeSeconds?: number;
  reload?: WeaponSimulationMetadata["reload"];
  firingModes: string[];
  sourceVersion?: string;
  components: DamageComponent[];
  assumptions: string[];
  warnings: string[];
};

export type WeaponProfileResult = {
  profiles: WeaponProfile[];
  unsupportedReasons: string[];
};

export type DpsValue = {
  standard: number;
  durable: number;
};

export type WeaponDpsResult = {
  damagePerTrigger: DpsValue;
  burstDps: DpsValue;
  magazineDamage: DpsValue;
  sustainedDps: DpsValue | null;
  timeToEmptySeconds: number | null;
  cycleSeconds: number | null;
  warnings: string[];
};

export type EnemyTarget = {
  enemyName: string;
  anatomyName: string;
  partName: string;
  difficulty: number;
  armorValue: number;
  durability: number;
  explosionResistance: number;
  mainHealth: number;
  partHealth: number | null;
  damageToMain: number;
  damageToMainCapped: boolean;
  fatal: boolean;
  mainConstitution: { health: number; decayPerSecond: number } | null;
  partConstitution: { health: number; decayPerSecond: number } | null;
};

export type EnemyTargetResult = {
  target: EnemyTarget | null;
  unsupportedReasons: string[];
};

export type DamageTrace = {
  componentId: string;
  rawStandard: number;
  rawDurable: number;
  durability: number;
  blendedDamage: number;
  armorMultiplier: number;
  explosionMultiplier: number;
  damagePerPacket: number;
  packets: number;
  partDamage: number;
  mainDamage: number;
};

export type TargetTtkResult = {
  status: "killed" | "part-destroyed" | "no-damage" | "unsupported";
  timeToKillSeconds: number | null;
  timeToDownSeconds: number | null;
  bleedoutSeconds: number | null;
  shots: number;
  reloads: number;
  killCondition: "main-depleted" | "fatal-part-destroyed" | "bleedout" | null;
  damagePerTrigger: {
    part: number;
    main: number;
  };
  trace: DamageTrace[];
  warnings: string[];
};

export type TargetSimulationOptions = {
  hitRate?: number;
};
