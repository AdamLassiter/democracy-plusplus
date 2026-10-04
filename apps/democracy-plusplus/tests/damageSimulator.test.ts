import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { BestiaryData, Enemy, EnemyAnatomy, EnemyFaction, Item } from "../src/types.ts";
import {
  effectiveEnemyHealth,
  enemyDifficultyRanges,
  normalizeEnemyTarget,
} from "../src/utils/damage/enemyTargets.ts";
import { buildWeaponCoverageReport } from "../src/utils/damage/coverage.ts";
import { validateExplosionScenarios } from "../src/utils/damage/explosionScenarios.ts";
import { calculateWeaponDps, simulateTargetTtk } from "../src/utils/damage/simulator.ts";
import {
  buildWeaponSourceConfigurations,
  validateWeaponSourceConfigurations,
} from "../src/utils/damage/sourceConfigurations.ts";
import type { WeaponProfile } from "../src/utils/damage/types.ts";
import { extractWeaponProfiles } from "../src/utils/damage/weaponProfiles.ts";

function liberator(overrides: Partial<Item> = {}): Item {
  return {
    displayName: "AR-23 Liberator",
    internalName: "ar23liberator",
    tier: "b",
    category: "primary",
    simulation: {
      reload: { emptySeconds: 3, tacticalSeconds: 2 },
      firingModes: ["Auto", "Semi", "Burst"],
      sourceVersion: "1.007.000",
    },
    properties: {
      "AR-23 LIBERATOR": {
        Base: { "Fire Rate": "640 rpm", Capacity: "45" },
        Attacks: { "*AR-23 P": "Projectile" },
      },
      "AR-23 P": {
        Projectile: { "Initial Velocity": "900 m/s" },
        Damage: { Standard: "90 Ballistic", "vs. Durable": "22 Ballistic" },
        Penetration: { Direct: "Light" },
      },
    },
    ...overrides,
  };
}

function targetFixture(anatomy: EnemyAnatomy): Enemy {
  return {
    displayName: "Test Enemy",
    faction: "Automatons",
    subfactions: [],
    description: "A simulation fixture.",
    enemyClass: "Test",
    wikiSlug: "Test_Enemy",
    wikiImageUrl: null,
    imageUrl: "enemies/test.png",
    variants: [],
    anatomy: [anatomy],
  };
}

const liveBestiary = JSON.parse(
  readFileSync(new URL("../public/data/enemies.json", import.meta.url), "utf8"),
) as BestiaryData;
const liveWeapons = [
  ...JSON.parse(readFileSync(new URL("../public/data/primaries.json", import.meta.url), "utf8")) as Item[],
  ...JSON.parse(readFileSync(new URL("../public/data/secondaries.json", import.meta.url), "utf8")) as Item[],
];

function liveWeapon(displayName: string) {
  const weapon = liveWeapons.find((candidate) => candidate.displayName === displayName);
  assert.ok(weapon, `${displayName} must exist in the generated weapon data`);
  return weapon;
}

test("extractWeaponProfiles normalizes a conventional magazine weapon", () => {
  const result = extractWeaponProfiles(liberator());
  assert.deepEqual(result.unsupportedReasons, []);
  assert.equal(result.profiles.length, 1);
  assert.deepEqual(result.profiles[0], {
    id: "ar23liberator:primary",
    itemDisplayName: "AR-23 Liberator",
    label: "AR-23 P",
    kind: "projectile",
    roundsPerMinute: 640,
    capacity: 45,
    reload: { emptySeconds: 3, tacticalSeconds: 2 },
    firingModes: ["Auto", "Semi", "Burst"],
    sourceVersion: "1.007.000",
    trigger: {
      kind: "single",
      ammoPerTrigger: 1,
      projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
      triggerIntervalSeconds: 60 / 640,
    },
    resource: {
      id: "ar23liberator:primary-resource",
      unit: "round",
      capacity: 45,
      reload: { emptySeconds: 3, tacticalSeconds: 2 },
    },
    components: [{
      id: "AR-23 P",
      kind: "direct",
      standardDamage: 90,
      durableDamage: 22,
      armorPenetration: 2,
      damageType: "Ballistic",
      packetsPerProjectile: 1,
    }],
    statuses: [],
    effects: [],
    assumptions: [
      "Point-blank damage with no falloff",
      "Every shot hits",
      "Maximum listed fire rate",
    ],
    warnings: [],
  });
});

test("calculateWeaponDps reports burst and reload-aware sustained values", () => {
  const profile = extractWeaponProfiles(liberator()).profiles[0];
  const result = calculateWeaponDps(profile);

  assert.deepEqual(result.damagePerTrigger, { standard: 90, durable: 22 });
  assert.deepEqual(result.magazineDamage, { standard: 4050, durable: 990 });
  assert.equal(result.burstDps.standard, 960);
  assert.ok(Math.abs(result.burstDps.durable - 234.6666666667) < 1e-9);
  assert.equal(result.timeToEmptySeconds, 4.125);
  assert.equal(result.cycleSeconds, 7.125);
  assert.ok(Math.abs((result.sustainedDps?.standard ?? 0) - 568.4210526316) < 1e-9);
  assert.ok(Math.abs((result.sustainedDps?.durable ?? 0) - 138.9473684211) < 1e-9);
});

test("missing reload data preserves burst DPS but declines sustained DPS", () => {
  const item = liberator({ simulation: { firingModes: ["Auto"] } });
  const profile = extractWeaponProfiles(item).profiles[0];
  const result = calculateWeaponDps(profile);

  assert.equal(result.burstDps.standard, 960);
  assert.equal(result.sustainedDps, null);
  assert.match(result.warnings[0], /reload time is missing/i);
});

test("shotguns multiply per-pellet damage and use per-round reload cycles", () => {
  const shotgun = liberator();
  shotgun.properties = {
    ...shotgun.properties,
    "AR-23 P": {
      Projectile: { Pellets: "x 9" },
      Damage: { Standard: "45 Ballistic", "vs. Durable": "12 Ballistic" },
      Penetration: { Direct: "Light" },
    },
  };
  const roundReload = liberator({ simulation: { reload: { perRoundSeconds: 0.6 } } });
  roundReload.properties = shotgun.properties;

  const profile = extractWeaponProfiles(roundReload).profiles[0];
  const result = calculateWeaponDps(profile);

  assert.equal(profile.kind, "shotgun");
  assert.equal(profile.components[0].packetsPerProjectile, 9);
  assert.deepEqual(result.damagePerTrigger, { standard: 405, durable: 108 });
  assert.equal(result.cycleSeconds, 31.125);
  assert.ok(Math.abs((result.sustainedDps?.standard ?? 0) - (18_225 / 31.125)) < 1e-9);
});

test("compound projectile profiles include one linked inner-radius explosion", () => {
  const explosive = liberator();
  explosive.properties = {
    "EXPLOSIVE WEAPON": {
      Base: { "Fire Rate": "60 rpm", Capacity: "1" },
      Attacks: { "*ROUND P": "Projectile", "**ROUND P IE": "Explosion" },
    },
    "ROUND P": {
      Projectile: { "Explosion On Impact": "ROUND_P_IE" },
      Damage: { Standard: "100 Ballistic", "vs. Durable": "50 Ballistic" },
      Penetration: { Direct: "Heavy" },
    },
    "ROUND P IE": {
      Damage: { "Inner Radius": "200 Explosion", "Inner Durable": "200 Explosion" },
      Penetration: { "Inner AP": "Anti-Tank I" },
    },
  };

  const profile = extractWeaponProfiles(explosive).profiles[0];
  const result = calculateWeaponDps(profile);
  assert.equal(profile.components.length, 2);
  assert.deepEqual(result.damagePerTrigger, { standard: 300, durable: 250 });
  assert.equal(profile.components[1].kind, "explosion");
  assert.equal(profile.components[1].armorPenetration, 5);
});

test("heat-per-shot weapons derive capacity and include warmup in their reload cycle", () => {
  const sickle = liberator();
  sickle.properties = {
    "LAS-16 SICKLE": {
      Base: { "Fire Rate": "750 rpm" },
      "Heat Data": {
        "Overheats at": "100 °C",
        Warmup: "0.5 sec",
        "Heat Per Shot": "1.15 °C",
      },
      Attacks: { "*LAS-16 P": "Projectile" },
    },
    "LAS-16 P": {
      Projectile: {},
      Damage: { Standard: "60 Ballistic", "vs. Durable": "6 Ballistic" },
      Penetration: { Direct: "Light" },
    },
  };
  sickle.simulation = { reload: { emptySeconds: 2.25 } };

  const profile = extractWeaponProfiles(sickle).profiles[0];
  const result = calculateWeaponDps(profile);
  assert.equal(profile.kind, "heat-projectile");
  assert.equal(profile.capacity, 87);
  assert.equal(profile.warmupSeconds, 0.5);
  assert.ok(Math.abs((result.timeToEmptySeconds ?? 0) - 7.38) < 1e-9);
  assert.ok(Math.abs((result.cycleSeconds ?? 0) - 9.63) < 1e-9);
});

test("beam weapons derive a continuous heat duration and beam count", () => {
  const beam = liberator();
  beam.properties = {
    "LAS-13 TRIDENT": {
      Base: {},
      "Heat Data": {
        "Overheats at": "100 °C",
        Warmup: "0.2 sec",
        "Heat Per Second": "12.5 °C",
        "Beam Fire Rate": "60 rpm",
        Beams: "x 3",
      },
      Attacks: { "*LAS-13 B": "Beam" },
    },
    "LAS-13 B": {
      Beam: { "Beam Range": "200 m" },
      Damage: { Standard: "100 Laser", "vs. Durable": "20 Laser" },
      Penetration: { Direct: "Light" },
    },
  };
  beam.simulation = { reload: { emptySeconds: 3 } };

  const profile = extractWeaponProfiles(beam).profiles[0];
  const result = calculateWeaponDps(profile);
  assert.equal(profile.kind, "beam");
  assert.equal(profile.firingDurationSeconds, 8);
  assert.equal(profile.capacity, 8);
  assert.deepEqual(result.damagePerTrigger, { standard: 300, durable: 60 });
  assert.deepEqual(result.magazineDamage, { standard: 2400, durable: 480 });
  assert.equal(result.cycleSeconds, 11.2);
});

test("arc weapons include only the initial arc in single-target damage", () => {
  const arc = liberator({ simulation: { fireRateRpm: 45, infiniteCapacity: true } });
  arc.properties = {
    "ARC WEAPON": {
      Base: { Barrels: "x 5" },
      Attacks: { "*ARC ATTACK": "Arc" },
    },
    "ARC ATTACK": {
      Arc: { "Arc Range": "25 m" },
      Damage: { Standard: "50 Arc", "vs. Durable": "35 Arc" },
      Penetration: { Direct: "Medium" },
    },
  };

  const profile = extractWeaponProfiles(arc).profiles[0];
  const result = calculateWeaponDps(profile);
  assert.equal(profile.kind, "arc");
  assert.equal(profile.components[0].packetsPerProjectile, 1);
  assert.equal(profile.infiniteCapacity, true);
  assert.equal(result.burstDps.standard, 37.5);
  assert.deepEqual(result.sustainedDps, result.burstDps);
  assert.equal(result.timeToEmptySeconds, null);
});

test("spray weapons derive tick cadence from listed DPS and documented fuel duration", () => {
  const spray = liberator({
    simulation: {
      reload: { emptySeconds: 3.25 },
      capacity: 100,
      capacitySeconds: 12.4,
      listedDps: 150,
    },
  });
  spray.properties = {
    "SPRAY WEAPON": { Base: {}, Attacks: { "*SPRAY ATTACK": "Spray" } },
    "SPRAY ATTACK": {
      Damage: { Standard: "2 Fire", "vs. Durable": "2 Fire" },
      Penetration: { Direct: "Heavy" },
    },
  };

  const profile = extractWeaponProfiles(spray).profiles[0];
  const result = calculateWeaponDps(profile);
  assert.equal(profile.kind, "spray");
  assert.equal(profile.roundsPerMinute, 4500);
  assert.equal(profile.firingDurationSeconds, 12.4);
  assert.equal(profile.capacity, 930);
  assert.equal(result.burstDps.standard, 150);
  assert.ok(Math.abs((result.sustainedDps?.standard ?? 0) - (1860 / 15.65)) < 1e-9);
});

test("damaging statuses expose sourced strength, active DPS, and full-duration damage", () => {
  const profile = extractWeaponProfiles(liveWeapon("FLAM-66 Torcher")).profiles[0];
  assert.equal(profile.kind, "spray");
  assert.equal(profile.statuses.length, 1);
  assert.deepEqual(profile.statuses[0], {
    id: "fire",
    label: "Fire",
    strengthPerPacket: 1,
    packetsPerProjectile: 1,
    durationSeconds: 3,
    stacking: "refresh",
    targetPool: "main",
    damagePerSecond: {
      id: "Fire",
      kind: "status",
      standardDamage: 100,
      durableDamage: 100,
      armorPenetration: 4,
      damageType: "Fire",
      packetsPerProjectile: 1,
    },
  });
  assert.deepEqual(calculateWeaponDps(profile).statuses, [{
    id: "fire",
    label: "Fire",
    strengthPerProjectile: 1,
    durationSeconds: 3,
    damagePerSecond: { standard: 100, durable: 100 },
    fullDurationDamage: { standard: 300, durable: 300 },
  }]);
});

test("non-damaging statuses remain descriptive and add no damage", () => {
  const profile = extractWeaponProfiles(liveWeapon("SMG-72 Pummeler")).profiles[0];
  assert.deepEqual(profile.statuses, []);
  assert.deepEqual(profile.effects, [{
    id: "stunmedium",
    label: "Stun Medium",
    strengthPerPacket: 2,
    packetsPerProjectile: 1,
    durationSeconds: 3,
  }]);
  assert.deepEqual(calculateWeaponDps(profile).damagePerTrigger, { standard: 85, durable: 17 });
});

test("Double-Edge Sickle progresses automatically through its four sourced heat bands", () => {
  const profile = extractWeaponProfiles(liveWeapon("LAS-17 Double-Edge Sickle")).profiles[0];
  assert.equal(profile.label, "Automatic heat progression");
  assert.equal(profile.capacity, 175);
  assert.deepEqual(profile.heatState?.bands.map(({ label, components }) => ({
    label,
    damage: components[0].standardDamage,
    penetration: components[0].armorPenetration,
  })), [
    { label: "0–25% heat", damage: 60, penetration: 2 },
    { label: "26–50% heat", damage: 55, penetration: 3 },
    { label: "51–90% heat", damage: 70, penetration: 3 },
    { label: "91%+ heat", damage: 70, penetration: 4 },
  ]);
  const calculation = calculateWeaponDps(profile);
  assert.equal(calculation.damagePerTrigger.standard, 60);
  assert.ok(Math.abs(calculation.sustainedDps!.standard - 816.6666666666666) < 1e-9);
  assert.ok(calculation.magazineDamage.standard > 11_000);
  assert.match(calculation.warnings.at(-1) ?? "", /saturated final heat band/i);
});

test("melee weapons use source cadence without inventing ammunition or reloads", () => {
  const melee = liberator({ simulation: { fireRateRpm: 100 } });
  melee.properties = {
    "MELEE WEAPON": { Base: {}, Attacks: { "*MELEE ATTACK": "Damage" } },
    "MELEE ATTACK": {
      Damage: { Standard: "240 Melee", "vs. Durable": "120 Melee" },
      Penetration: { Direct: "Medium" },
    },
  };

  const profile = extractWeaponProfiles(melee).profiles[0];
  assert.equal(profile.kind, "melee");
  assert.equal(profile.infiniteCapacity, true);
  assert.equal(calculateWeaponDps(profile).sustainedDps?.standard, 400);
});

test("charge weapons expose source breakpoints as distinct firing profiles", () => {
  const chargeWeapon = liberator();
  const base = chargeWeapon.properties?.["AR-23 LIBERATOR"] as Record<string, unknown>;
  chargeWeapon.properties = {
    ...chargeWeapon.properties,
    "AR-23 LIBERATOR": {
      ...base,
      Charge: {
        "at (0.25)s": "0.50 dmg × DEFAULT",
        "at (1.00)s": "1.00 dmg × AR-23 P",
      },
    },
  };

  const result = extractWeaponProfiles(chargeWeapon);
  assert.deepEqual(result.unsupportedReasons, []);
  assert.equal(result.profiles.length, 2);
  assert.equal(result.profiles[0].kind, "charge");
  assert.equal(result.profiles[0].chargeSeconds, 0.25);
  assert.equal(result.profiles[0].roundsPerMinute, 240);
  assert.equal(result.profiles[0].components[0].standardDamage, 45);
  assert.equal(result.profiles[1].warmupSeconds, 1);
  assert.equal(calculateWeaponDps(result.profiles[1]).burstDps.standard, 90);
});

test("VG-70 profiles distinguish auto, seven-round volley, and total magazine triggers", () => {
  const result = extractWeaponProfiles(liveWeapon("VG-70 Variable"));

  assert.equal(result.profiles.length, 9);
  const auto = result.profiles.find(({ label }) => label === "Auto · 1 round · 750 rpm");
  const volley = result.profiles.find(({ label }) => label === "Volley · 7 rounds · 750 rpm");
  const total = result.profiles.find(({ label }) => label === "Total · 49 rounds · 750 rpm");
  assert.ok(auto && volley && total);
  assert.equal(calculateWeaponDps(auto).damagePerTrigger.standard, 85);
  assert.equal(calculateWeaponDps(volley).damagePerTrigger.standard, 595);
  assert.equal(calculateWeaponDps(total).damagePerTrigger.standard, 4165);
  assert.equal(calculateWeaponDps(total).magazineDamage.standard, 4165);
});

test("Total mode derives its projectile count and committed ammunition from the loaded magazine", () => {
  const total = extractWeaponProfiles(liveWeapon("VG-70 Variable")).profiles
    .find(({ label }) => label === "Total · 49 rounds · 750 rpm");
  assert.ok(total);
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "800",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);

  const result = simulateTargetTtk(total, target, { startingAmmunition: 10 });
  assert.equal(result.status, "killed");
  assert.equal(result.shots, 1);
  assert.equal(result.roundsConsumed, 10);
  assert.equal(result.damagePerTrigger.main, 850);
  assert.ok(Math.abs((result.timeToKillSeconds ?? 0) - 0.72) < 0.000001);
});

test("source configurations preserve reviewed subweapons, modes, and provenance", () => {
  const oneTwo = buildWeaponSourceConfigurations(liveWeapon("AR/GL-21 One-Two"));
  assert.deepEqual(oneTwo.map(({ id, capacity }) => ({ id, capacity })), [
    { id: "8mm-rifle", capacity: 40 },
    { id: "40mm-grenade", capacity: 1 },
  ]);
  assert.match(oneTwo[0].sourceUrl ?? "", /AR\/GL-21_One-Two$/);
  assert.equal(oneTwo[0].sourceVersion, "1.006.100");
  assert.equal(oneTwo[0].reload?.emptySeconds, 3.33);
  assert.equal(oneTwo[1].reload?.emptySeconds, 2.5);

  const variable = buildWeaponSourceConfigurations(liveWeapon("VG-70 Variable"));
  assert.deepEqual(variable[0].fireRatesRpm, [300, 550, 750]);
  assert.deepEqual(variable[0].firingModes?.map(({ id, roundsPerTrigger, consumes }) => ({
    id,
    roundsPerTrigger,
    consumes,
  })), [
    { id: "auto", roundsPerTrigger: 1, consumes: "fixed" },
    { id: "volley", roundsPerTrigger: 7, consumes: "fixed" },
    { id: "total", roundsPerTrigger: undefined, consumes: "remaining" },
  ]);
});

test("every generated source configuration has valid unique identifiers and positive resources", () => {
  for (const weapon of liveWeapons) {
    const configurations = buildWeaponSourceConfigurations(weapon);
    assert.deepEqual(
      validateWeaponSourceConfigurations(configurations),
      [],
      `${weapon.displayName} should have valid source configurations`,
    );
  }
});

test("Bushwhacker profiles separate single and all-barrel ammunition consumption", () => {
  const result = extractWeaponProfiles(liveWeapon("SG-22 Bushwhacker"));
  assert.deepEqual(result.profiles.map(({ label }) => label), [
    "Semi · 1 round · 650 rpm",
    "All barrels · 3 rounds · 650 rpm",
  ]);
  assert.equal(calculateWeaponDps(result.profiles[0]).damagePerTrigger.standard, 405);
  assert.equal(calculateWeaponDps(result.profiles[1]).damagePerTrigger.standard, 1215);
  assert.equal(result.profiles[1].trigger.ammoPerTrigger, 3);
  assert.deepEqual(result.profiles[0].resource.reload, {
    emptySeconds: 1.75,
    firstRoundSeconds: 1.1,
    additionalRoundSeconds: 0.3,
  });
});

test("alternate-ammunition weapons expose only mechanically distinct damage profiles", () => {
  const halt = extractWeaponProfiles(liveWeapon("SG-20 Halt"));
  assert.deepEqual(halt.profiles.map(({ label }) => label), ["Flechette", "Stun rounds"]);
  assert.deepEqual(halt.profiles.map((profile) => calculateWeaponDps(profile).damagePerTrigger.standard), [385, 120]);
  assert.ok(halt.profiles.every(({ resource }) => resource.capacity === 8));
  assert.ok(halt.profiles.every(({ resource }) => resource.reload?.firstRoundSeconds === 1.25));

  const warrant = extractWeaponProfiles(liveWeapon("P-92 Warrant"));
  assert.deepEqual(warrant.profiles.map(({ label }) => label), ["Guided / non-guided"]);
  assert.match(warrant.profiles[0].assumptions.join(" "), /Guidance changes targeting behavior/i);
});

test("combination weapons expose independent primary and underbarrel profiles", () => {
  const oneTwo = extractWeaponProfiles(liveWeapon("AR/GL-21 One-Two"));
  assert.deepEqual(oneTwo.profiles.map(({ label }) => label), ["8 mm rifle", "40 mm grenade launcher"]);
  assert.equal(oneTwo.profiles[0].resource.capacity, 40);
  assert.equal(oneTwo.profiles[1].resource.capacity, 1);
  assert.deepEqual(calculateWeaponDps(oneTwo.profiles[1]).damagePerTrigger, { standard: 650, durable: 650 });

  const stoker = extractWeaponProfiles(liveWeapon("SMG/FLAM-34 Stoker"));
  assert.deepEqual(stoker.profiles.map(({ label }) => label), ["12 mm SMG", "Flame projector"]);
  assert.equal(stoker.profiles[0].kind, "projectile");
  assert.equal(stoker.profiles[1].kind, "spray");

  const arbitrator = extractWeaponProfiles(liveWeapon("AR-11 Arbitrator"));
  assert.deepEqual(arbitrator.profiles.map(({ label }) => label), ["4 mm rifle", "10-gauge underbarrel"]);
  assert.equal(calculateWeaponDps(arbitrator.profiles[1]).damagePerTrigger.standard, 450);
});

test("normalizeEnemyTarget resolves Main health and difficulty armor", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "2",
      armorByDifficulty: { "6": "3" },
      health: "1,200",
      healthByDifficulty: { "6": 1600 },
      durability: "50%",
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 0.25,
    },
  ] };
  const result = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 7);

  assert.deepEqual(result.unsupportedReasons, []);
  assert.deepEqual(result.target, {
    enemyId: "test-enemy",
    enemyName: "Test Enemy",
    anatomyId: "standard",
    anatomyName: "Standard",
    aimedPartId: "main",
    partName: "Main",
    difficulty: 7,
    armorValue: 3,
    durability: 0.5,
    explosionResistance: 0.25,
    mainHealth: 1600,
    mainArmorValue: 3,
    partHealth: null,
    damageToMain: 1,
    damageToMainCapped: false,
    fatal: true,
    mainConstitution: null,
    partConstitution: null,
    parts: [{
      id: "main",
      name: "Main",
      count: 1,
      armorValue: 3,
      durability: 0.5,
      explosionResistance: 0.25,
      partHealth: null,
      damageToMain: 1,
      damageToMainCapped: false,
      fatal: true,
      constitution: null,
      explosionVerificationMode: undefined,
    }],
    explosionScenarios: [],
    elementalMultipliers: {},
    statusThresholds: {},
  });
});

test("a curated centre-mass explosion reproduces the GP-20 Dragonroach body-shot kill", () => {
  const dragonroach = liveBestiary.enemies.find(({ displayName }) => displayName === "Dragonroach");
  assert.ok(dragonroach);
  const anatomy = dragonroach.anatomy.find(({ name }) => name === "Standard");
  assert.ok(anatomy);
  const abdomenArmor = anatomy.parts.find(({ name }) => name === "Abdomen Armor");
  assert.ok(abdomenArmor);
  const target = normalizeEnemyTarget(dragonroach, anatomy, abdomenArmor, 10).target;
  assert.ok(target);
  const scenario = target.explosionScenarios.find(({ id }) => id === "dragonroach:standard:centre-mass");
  assert.ok(scenario);
  const profile = extractWeaponProfiles(liveWeapon("GP-20 Ultimatum")).profiles[0];

  const singlePart = simulateTargetTtk(profile, target);
  assert.ok(singlePart.shots > 1);

  const result = simulateTargetTtk(profile, target, { impactScenarioId: scenario.id });
  assert.equal(result.status, "killed");
  assert.equal(result.shots, 1);
  assert.equal(result.timeToKillSeconds, 0);
  assert.equal(result.damagePerTrigger.main, 6700);
  assert.equal(result.trace.filter(({ componentId }) => componentId === "GP-20 P IE").length, 9);
  assert.match(result.warnings[0], /exact overlap map is a reviewed reproduction fixture/i);

  const reversedTarget = {
    ...target,
    explosionScenarios: [{ ...scenario, affectedParts: [...scenario.affectedParts].reverse() }],
  };
  const reversed = simulateTargetTtk(profile, reversedTarget, { impactScenarioId: scenario.id });
  assert.equal(reversed.damagePerTrigger.main, result.damagePerTrigger.main);
  assert.equal(reversed.status, "killed");
  for (const affected of scenario.affectedParts) {
    const partCount = target.parts.find(({ id }) => id === affected.partId)?.count ?? 0;
    assert.ok(affected.instances <= partCount);
  }
});

test("curated explosion scenarios reference valid anatomy parts and instance counts", () => {
  assert.deepEqual(validateExplosionScenarios(liveBestiary.enemies), []);
});

test("arming distance excludes the explosion until the target is beyond the sourced minimum", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "500",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const profile = extractWeaponProfiles(liveWeapon("GP-31 Grenade Pistol")).profiles[0];
  const explosion = profile.components.find(({ kind }) => kind === "explosion");
  assert.equal(explosion?.minimumArmingDistanceMeters, 4);

  const pointBlank = simulateTargetTtk(profile, target, { distanceMeters: 0 });
  assert.equal(pointBlank.status, "killed");
  assert.equal(pointBlank.shots, 2);
  assert.equal(pointBlank.damagePerTrigger.main, 250);
  assert.match(pointBlank.warnings.join(" "), /arms at 4m/i);

  const armed = simulateTargetTtk(profile, target, { distanceMeters: 4 });
  assert.equal(armed.status, "killed");
  assert.equal(armed.shots, 1);
  assert.equal(armed.damagePerTrigger.main, 650);
  assert.equal(armed.timeToKillSeconds, 0);
});

test("the Breacher schedules its terminal explosion after the sourced projectile lifetime", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "1,000",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const profile = extractWeaponProfiles(liveWeapon("P-34 Breacher")).profiles[0];
  const explosion = profile.components.find(({ kind }) => kind === "explosion");
  assert.ok(explosion);
  assert.ok(Math.abs((explosion.offsetSeconds ?? 0) - 1.70000005) < 0.000001);

  const result = simulateTargetTtk(profile, target);
  assert.equal(result.status, "killed");
  assert.ok(Math.abs((result.timeToKillSeconds ?? 0) - 1.70000005) < 0.000001);
  assert.equal(result.trace.find(({ componentId }) => componentId === explosion.id)?.eventOffsetSeconds, 1.70000005);
});

test("enemy difficulty ranges collapse unchanged difficulties around stat breakpoints", () => {
  const enemy = targetFixture({ name: "Standard", parts: [
    {
      name: "Main",
      armor: "2",
      armorByDifficulty: { "6": "3" },
      health: "1,200",
      healthByDifficulty: { "4": 1600 },
      durability: "50%",
    },
  ] });

  assert.deepEqual(enemyDifficultyRanges(enemy), [
    { minimum: 1, maximum: 3 },
    { minimum: 4, maximum: 5 },
    { minimum: 6, maximum: 10 },
  ]);
  assert.equal(effectiveEnemyHealth(enemy.anatomy[0].parts[0], 3), 1200);
  assert.equal(effectiveEnemyHealth(enemy.anatomy[0].parts[0], 4), 1600);
});

test("enemies without difficulty-dependent stats have one invariant range", () => {
  const enemy = targetFixture({ name: "Standard", parts: [
    { name: "Main", armor: "2", health: "1,200", durability: "50%" },
  ] });

  assert.deepEqual(enemyDifficultyRanges(enemy), [{ minimum: 1, maximum: 10 }]);
});

test("target TTK applies equal-armor resistance, cadence, and reload timing", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "2",
    health: "5,000",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.trace[0].armorMultiplier, 0.65);
  assert.equal(result.damagePerTrigger.main, 58);
  assert.equal(result.shots, 87);
  assert.equal(result.reloads, 1);
  assert.equal(result.timeToKillSeconds, 10.96875);
  assert.equal(result.killCondition, "main-depleted");
});

test("target TTK rejects attacks whose penetration is below armor", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "3",
    health: "100",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.status, "no-damage");
  assert.equal(result.trace[0].armorMultiplier, 0);
  assert.equal(result.timeToKillSeconds, null);
});

test("explosions use durable damage and selected-part explosion resistance", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "110",
    durability: "50%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0.5,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const profile: WeaponProfile = {
    id: "compound",
    itemDisplayName: "Compound weapon",
    label: "Combined impact",
    kind: "projectile",
    roundsPerMinute: 60,
    capacity: 1,
    reload: { emptySeconds: 2 },
    firingModes: [],
    trigger: {
      kind: "single",
      ammoPerTrigger: 1,
      projectileEvents: [{ offsetSeconds: 0, projectiles: 1 }],
      triggerIntervalSeconds: 1,
    },
    resource: {
      id: "compound-ammunition",
      unit: "round",
      capacity: 1,
      reload: { emptySeconds: 2 },
    },
    components: [
      {
        id: "direct",
        kind: "direct",
        standardDamage: 100,
        durableDamage: 20,
        armorPenetration: 1,
        damageType: "Ballistic",
        packetsPerProjectile: 1,
      },
      {
        id: "explosion",
        kind: "explosion",
        standardDamage: 200,
        durableDamage: 100,
        armorPenetration: 1,
        damageType: "Explosion",
        packetsPerProjectile: 1,
        radius: "inner",
      },
    ],
    statuses: [],
    effects: [],
    assumptions: [],
    warnings: [],
  };
  const result = simulateTargetTtk(profile, target);

  assert.equal(result.trace[0].damagePerPacket, 60);
  assert.equal(result.trace[1].durability, 1);
  assert.equal(result.trace[1].explosionMultiplier, 0.5);
  assert.equal(result.trace[1].damagePerPacket, 50);
  assert.equal(result.timeToKillSeconds, 0);
});

test("Affected by Explosion redirects at most once across fully resistant parts", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "1",
      health: "1,000",
      durability: "100%",
      fatal: true,
      explosionResistance: 0,
    },
    {
      name: "Left Shield",
      armor: "0",
      health: "500",
      durability: "0%",
      percentToMain: 1,
      fatal: false,
      explosionResistance: 1,
    },
    {
      name: "Right Shield",
      armor: "0",
      health: "500",
      durability: "0%",
      percentToMain: 1,
      fatal: false,
      explosionResistance: 1,
    },
  ] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[1], 5).target;
  assert.ok(target);
  target.explosionScenarios = [{
    id: "test:both-shields",
    enemyId: target.enemyId,
    anatomyId: target.anatomyId,
    label: "Both shields",
    affectedParts: [
      { partId: "left-shield", instances: 1, radius: "inner", lineOfSight: true },
      { partId: "right-shield", instances: 1, radius: "inner", lineOfSight: true },
    ],
    sourceUrl: "https://example.invalid/test",
    confidence: "curated",
  }];
  const base = extractWeaponProfiles(liberator()).profiles[0];
  const profile: WeaponProfile = {
    ...base,
    components: [{
      id: "blast",
      kind: "explosion",
      standardDamage: 200,
      durableDamage: 200,
      armorPenetration: 2,
      damageType: "Explosion",
      packetsPerProjectile: 1,
      radius: "inner",
    }],
  };

  const result = simulateTargetTtk(profile, target, { impactScenarioId: "test:both-shields" });
  assert.equal(result.damagePerTrigger.main, 200);
  assert.equal(result.trace.filter(({ componentId }) => componentId.includes("Affected by Explosion")).length, 1);
});

test("outer-radius scenarios use outer AP and explicit linear-falloff fractions", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "2",
    health: "1,000",
    durability: "100%",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  target.explosionScenarios = [{
    id: "test:outer",
    enemyId: target.enemyId,
    anatomyId: target.anatomyId,
    label: "Outer radius",
    affectedParts: [{
      partId: "main",
      instances: 1,
      radius: "outer",
      damageFraction: 0.5,
      lineOfSight: true,
    }],
    sourceUrl: "https://example.invalid/test",
    confidence: "curated",
  }];
  const base = extractWeaponProfiles(liberator()).profiles[0];
  const profile: WeaponProfile = {
    ...base,
    components: [{
      id: "blast",
      kind: "explosion",
      standardDamage: 400,
      durableDamage: 400,
      armorPenetration: 4,
      damageType: "Explosion",
      packetsPerProjectile: 1,
      radius: "inner",
      outer: { standardDamage: 200, durableDamage: 200, armorPenetration: 2 },
    }],
  };

  const result = simulateTargetTtk(profile, target, { impactScenarioId: "test:outer" });
  assert.equal(result.trace[0].rawDurable, 200);
  assert.equal(result.trace[0].armorMultiplier, 0.65);
  assert.equal(result.damagePerTrigger.main, 65);
});

test("explosion verification mode controls whether absent line of sight blocks a scenario hit", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "1,000",
    durability: "100%",
    fatal: true,
    explosionResistance: 0,
    explosionVerificationMode: "None",
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  target.explosionScenarios = [{
    id: "test:occluded",
    enemyId: target.enemyId,
    anatomyId: target.anatomyId,
    label: "Occluded",
    affectedParts: [{ partId: "main", instances: 1, radius: "inner", lineOfSight: false }],
    sourceUrl: "https://example.invalid/test",
    confidence: "curated",
  }];
  const base = extractWeaponProfiles(liberator()).profiles[0];
  const profile: WeaponProfile = {
    ...base,
    components: [{
      id: "blast",
      kind: "explosion",
      standardDamage: 200,
      durableDamage: 200,
      armorPenetration: 1,
      damageType: "Explosion",
      packetsPerProjectile: 1,
      radius: "inner",
    }],
  };

  const ignoresLineOfSight = simulateTargetTtk(profile, target, { impactScenarioId: "test:occluded" });
  assert.equal(ignoresLineOfSight.damagePerTrigger.main, 200);

  target.parts[0].explosionVerificationMode = "All";
  const requiresLineOfSight = simulateTargetTtk(profile, target, { impactScenarioId: "test:occluded" });
  assert.equal(requiresLineOfSight.damagePerTrigger.main, 0);
  assert.equal(requiresLineOfSight.status, "no-damage");
});

test("target TTK blends durable damage and kills a fatal part", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "0",
      health: "750",
      durability: "0%",
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 0,
    },
    {
      name: "Head",
      armor: "1",
      health: "110",
      durability: "100%",
      percentToMain: 1,
      damageToMainCapped: true,
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 1,
    },
  ] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[1], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.damagePerTrigger.part, 22);
  assert.equal(result.shots, 5);
  assert.equal(result.timeToKillSeconds, 0.375);
  assert.equal(result.killCondition, "fatal-part-destroyed");
});

test("capped Main transfer excludes body-part overkill", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "0",
      health: "125",
      durability: "0%",
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 0,
    },
    {
      name: "Arm",
      armor: "0",
      health: "65",
      durability: "0%",
      percentToMain: 0.5,
      damageToMainCapped: true,
      bleed: null,
      bleedDescription: "None",
      fatal: false,
      explosionResistance: 1,
    },
  ] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[1], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.damagePerTrigger.main, 32);
  assert.equal(result.status, "part-destroyed");
  assert.equal(result.shots, 1);
});

test("health-Main weak points retain transfer multipliers above 100%", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "4",
      health: "540",
      durability: "100%",
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 0,
    },
    {
      name: "Inner Flesh",
      armor: "0",
      health: "Main",
      durability: "0%",
      percentToMain: 3,
      damageToMainCapped: true,
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 1,
    },
  ] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[1], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.damagePerTrigger.main, 270);
  assert.equal(result.shots, 2);
  assert.equal(result.timeToKillSeconds, 0.09375);
});

test("constitution reports down time and accounts for bleed while firing", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "90",
    durability: "0%",
    bleed: { constitution: 100, decayPerSecond: 50 },
    bleedDescription: "100 [-50/s]",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.timeToDownSeconds, 0);
  assert.equal(result.timeToKillSeconds, 0.1875);
  assert.equal(result.bleedoutSeconds, 0.1875);
  assert.equal(result.killCondition, "bleedout");
});

test("zero-decay limb constitution is depleted by continued part damage", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [
    {
      name: "Main",
      armor: "0",
      health: "1,000",
      durability: "0%",
      bleed: null,
      bleedDescription: "None",
      fatal: true,
      explosionResistance: 0,
    },
    {
      name: "Leg Assembly",
      armor: "0",
      health: "100",
      durability: "0%",
      percentToMain: 0.4,
      damageToMainCapped: true,
      bleed: { constitution: 100, decayPerSecond: 0 },
      bleedDescription: "100 [-0/s]",
      fatal: true,
      explosionResistance: 0,
    },
  ] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[1], 5).target;
  assert.ok(target);
  const result = simulateTargetTtk(extractWeaponProfiles(liberator()).profiles[0], target);

  assert.equal(result.timeToDownSeconds, 0.09375);
  assert.equal(result.timeToKillSeconds, 0.1875);
  assert.equal(result.shots, 3);
  assert.equal(result.killCondition, "bleedout");
});

test("practical hit rate produces a separately warned expected-value TTK", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "90",
    durability: "0%",
    bleed: null,
    bleedDescription: "None",
    fatal: true,
    explosionResistance: 0,
  }] };
  const target = normalizeEnemyTarget(targetFixture(anatomy), anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const profile = extractWeaponProfiles(liberator()).profiles[0];

  assert.equal(simulateTargetTtk(profile, target).timeToKillSeconds, 0);
  const practical = simulateTargetTtk(profile, target, { hitRate: 0.5 });
  assert.equal(practical.timeToKillSeconds, 0.09375);
  assert.match(practical.warnings.at(-1) ?? "", /50% hit rate/i);
});

test("guaranteed Fire buildup refreshes without stacking and damages Main over time", () => {
  const anatomy: EnemyAnatomy = { name: "Standard", parts: [{
    name: "Main",
    armor: "0",
    health: "150",
    durability: "0%",
    fatal: true,
    explosionResistance: 0,
  }] };
  const enemy = targetFixture(anatomy);
  enemy.elementalMultipliers = { Fire: 1 };
  enemy.statusThresholds = { fire: { minimum: 0.5, guaranteed: 1 } };
  const target = normalizeEnemyTarget(enemy, anatomy, anatomy.parts[0], 5).target;
  assert.ok(target);
  const base = extractWeaponProfiles(liberator()).profiles[0];
  const profile: WeaponProfile = {
    ...base,
    roundsPerMinute: 60,
    trigger: { ...base.trigger, triggerIntervalSeconds: 1 },
    components: [{ ...base.components[0], standardDamage: 10, durableDamage: 10 }],
    statuses: [{
      id: "fire",
      label: "Fire",
      strengthPerPacket: 1,
      packetsPerProjectile: 1,
      durationSeconds: 3,
      stacking: "refresh",
      targetPool: "main",
      damagePerSecond: {
        id: "Fire",
        kind: "status",
        standardDamage: 100,
        durableDamage: 100,
        armorPenetration: 4,
        damageType: "Fire",
        packetsPerProjectile: 1,
      },
    }],
  };

  const result = simulateTargetTtk(profile, target);
  assert.equal(result.status, "killed");
  assert.equal(result.shots, 2);
  assert.equal(result.timeToKillSeconds, 1.3);
  assert.equal(result.timeToDownSeconds, 1.3);
  assert.equal(result.statusDamageToMain, 130);
  assert.doesNotMatch(result.warnings.join(" "), /excluded from combined TTK/i);
});

test("the generated bestiary has a simulatable kill target for every faction", () => {
  const profile = extractWeaponProfiles(liberator()).profiles[0];
  const factions: EnemyFaction[] = ["Terminids", "Automatons", "Illuminate", "Super Earth"];

  for (const faction of factions) {
    const killed = liveBestiary.enemies
      .filter((enemy) => enemy.faction === faction)
      .some((enemy) => enemy.anatomy.some((anatomy) => anatomy.parts.some((part) => {
        const normalized = normalizeEnemyTarget(enemy, anatomy, part, 5).target;
        return normalized ? simulateTargetTtk(profile, normalized).status === "killed" : false;
      })));
    assert.equal(killed, true, `${faction} should expose at least one target the fixture weapon can kill`);
  }
});

test("the primary and secondary damage-simulation coverage report is deterministic and exhaustive", () => {
  const report = buildWeaponCoverageReport(liveWeapons);
  assert.equal(report.length, liveWeapons.length);
  assert.equal(new Set(report.map(({ weapon }) => weapon)).size, liveWeapons.length);
  assert.deepEqual(
    Object.fromEntries(["direct", "explosion", "status", "timing", "targetTtk"].map((field) => [
      field,
      Object.fromEntries(["complete", "partial", "unsupported", "not-applicable"].map((state) => [
        state,
        report.filter((row) => row[field as keyof typeof row] === state).length,
      ])),
    ])),
    {
      direct: { complete: 77, partial: 0, unsupported: 3, "not-applicable": 0 },
      explosion: { complete: 14, partial: 0, unsupported: 0, "not-applicable": 66 },
      status: { complete: 14, partial: 1, unsupported: 2, "not-applicable": 63 },
      timing: { complete: 77, partial: 0, unsupported: 3, "not-applicable": 0 },
      targetTtk: { complete: 76, partial: 1, unsupported: 3, "not-applicable": 0 },
    },
  );
  const published = JSON.parse(readFileSync(
    new URL("../public/data/damage-simulation-coverage.json", import.meta.url),
    "utf8",
  ));
  assert.deepEqual(published, report);
  assert.deepEqual(
    report.filter(({ direct }) => direct === "unsupported").map(({ weapon }) => weapon),
    ["CQC-19 Stun Lance", "CQC-30 Stun Baton", "P-11 Stim Pistol"],
  );
  assert.deepEqual(
    report.filter(({ status }) => status === "partial").map(({ weapon }) => weapon),
    ["P-34 Breacher"],
  );
});
