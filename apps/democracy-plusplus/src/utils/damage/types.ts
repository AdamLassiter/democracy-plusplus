import type { WeaponSimulationMetadata } from "../../types";

export type DamageComponent = {
  id: string;
  kind: "direct" | "explosion" | "status";
  standardDamage: number;
  durableDamage: number;
  armorPenetration: number;
  damageType: string;
  packetsPerProjectile: number;
  offsetSeconds?: number;
  minimumArmingDistanceMeters?: number;
  radius?: "inner" | "outer";
  outer?: {
    standardDamage: number;
    durableDamage: number;
    armorPenetration: number;
  };
};

export type ProjectileEventDefinition = {
  offsetSeconds: number;
  projectiles: number;
};

export type TriggerPattern = {
  kind: "single" | "volley" | "burst" | "remaining-magazine" | "continuous";
  ammoPerTrigger: number | "remaining";
  projectileEvents: ProjectileEventDefinition[];
  triggerIntervalSeconds: number;
  cycleStartDelaySeconds?: number;
  remainingProjectileIntervalSeconds?: number;
};

export type WeaponResource = {
  id: string;
  unit: "round" | "shell" | "fuel" | "heat-sink" | "unlimited";
  capacity: number;
  infinite?: true;
  reload?: WeaponSimulationMetadata["reload"];
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
  trigger: TriggerPattern;
  resource: WeaponResource;
  components: DamageComponent[];
  statuses: WeaponStatusApplication[];
  effects: WeaponNonDamageEffect[];
  heatState?: {
    heatPerProjectile: number;
    threshold: number;
    coolingRatesPerSecond: number[];
    saturates: boolean;
    bands: Array<{
      minimumFraction: number;
      label: string;
      components: DamageComponent[];
    }>;
  };
  assumptions: string[];
  warnings: string[];
};

export type WeaponNonDamageEffect = {
  id: string;
  label: string;
  strengthPerPacket: number;
  packetsPerProjectile: number;
  durationSeconds: number;
};

export type WeaponStatusApplication = {
  id: string;
  label: string;
  strengthPerPacket: number;
  packetsPerProjectile: number;
  durationSeconds: number;
  stacking: "refresh" | "stack" | "replace-stronger";
  targetPool: "main";
  damagePerSecond: DamageComponent;
};

export type WeaponStatusDpsResult = {
  id: string;
  label: string;
  strengthPerProjectile: number;
  durationSeconds: number;
  damagePerSecond: DpsValue;
  fullDurationDamage: DpsValue;
};

export type WeaponProfileResult = {
  profiles: WeaponProfile[];
  unsupportedReasons: string[];
};

export type CombatSourceKind =
  | "carried-weapon"
  | "support-weapon"
  | "mounted-weapon"
  | "autonomous-weapon"
  | "trap"
  | "focused-strike"
  | "distributed-strike"
  | "persistent-area";

export type CombatSourceControl = "player" | "autonomous" | "proximity" | "scripted-pattern";

export type TargetExposureScenario = {
  id: string;
  label: string;
  payloadHits: number;
  confidence: "sourced" | "verified" | "estimated";
  note?: string;
};

export type CombatSourceDelivery = {
  kind: CombatSourceKind;
  control: CombatSourceControl;
  totalPayloads: number;
  activationDelaySeconds?: number;
  activeDurationSeconds?: number;
  cooldownSeconds?: number;
  rearmSeconds?: number;
  uses?: number | "unlimited";
  exposureScenarios: TargetExposureScenario[];
  replenishment: "reload" | "resupply" | "cooldown" | "rearm" | "disposable" | "persistent";
  assumptions: string[];
};

export type CombatSourceProfile = WeaponProfile & {
  sourceKind: "weapon" | "stratagem";
  delivery: CombatSourceDelivery;
};

export type CombatSourceProfileResult = {
  profiles: CombatSourceProfile[];
  unsupportedReasons: string[];
  intentionallyNonDamaging?: true;
};

export type StratagemSimulationResult = {
  perPayload: DpsValue;
  selectedTarget: {
    exposure: TargetExposureScenario;
    damage: DpsValue;
    ttk: TargetTtkResult | null;
    kills: boolean | null;
  };
  deployment: {
    payloadCount: number;
    areaOutput: DpsValue;
    activeWindowSeconds: number | null;
    activeWindowDps: DpsValue | null;
  };
  timing: {
    activationToFirstPayloadSeconds: number | null;
    onTargetKillSeconds: number | null;
    requestToKillSeconds: number | null;
    cooldownSeconds: number | null;
    rearmSeconds: number | null;
    cooldownAmortizedThroughput: DpsValue | null;
    rearmAmortizedThroughput: DpsValue | null;
  };
  assumptions: string[];
  warnings: string[];
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
  statuses: WeaponStatusDpsResult[];
  warnings: string[];
};

export type EnemyTarget = {
  enemyId: string;
  enemyName: string;
  anatomyId: string;
  anatomyName: string;
  aimedPartId: string;
  partName: string;
  difficulty: number;
  armorValue: number;
  durability: number;
  explosionResistance: number;
  mainHealth: number;
  mainArmorValue: number;
  partHealth: number | null;
  damageToMain: number;
  damageToMainCapped: boolean;
  fatal: boolean;
  mainConstitution: { health: number; decayPerSecond: number } | null;
  partConstitution: { health: number; decayPerSecond: number } | null;
  parts: EnemyTargetPart[];
  explosionScenarios: EnemyExplosionScenario[];
  elementalMultipliers: Partial<Record<"Fire" | "Gas" | "Arc" | "Acid", number>>;
  statusThresholds: Partial<Record<string, { minimum: number; guaranteed: number }>>;
};

export type EnemyTargetPart = {
  id: string;
  name: string;
  count: number;
  armorValue: number;
  durability: number;
  explosionResistance: number;
  partHealth: number | null;
  damageToMain: number;
  damageToMainCapped: boolean;
  fatal: boolean;
  constitution: { health: number; decayPerSecond: number } | null;
  explosionVerificationMode?: string;
};

export type EnemyExplosionScenarioPart = {
  partId: string;
  instances: number;
  radius: "inner" | "outer";
  damageFraction?: number;
  lineOfSight: boolean;
};

export type EnemyExplosionScenario = {
  id: string;
  enemyId: string;
  anatomyId: string;
  label: string;
  directHitPartId?: string;
  affectedParts: EnemyExplosionScenarioPart[];
  sourceUrl: string;
  sourceVersion?: string;
  confidence: "sourced" | "curated" | "estimated";
  note?: string;
};

export type EnemyTargetResult = {
  target: EnemyTarget | null;
  unsupportedReasons: string[];
};

export type DamageTrace = {
  componentId: string;
  targetPartId?: string;
  targetPartName?: string;
  targetPartInstance?: number;
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
  eventOffsetSeconds?: number;
};

export type TargetTtkResult = {
  status: "killed" | "part-destroyed" | "no-damage" | "unsupported";
  timeToKillSeconds: number | null;
  timeToDownSeconds: number | null;
  bleedoutSeconds: number | null;
  shots: number;
  roundsConsumed: number;
  statusDamageToMain: number;
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
  impactScenarioId?: string;
  distanceMeters?: number;
  startingAmmunition?: number;
};
