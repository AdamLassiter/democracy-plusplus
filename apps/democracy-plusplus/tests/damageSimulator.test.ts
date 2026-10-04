import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { BestiaryData, Enemy, EnemyAnatomy, EnemyFaction, Item } from "../src/types.ts";
import { normalizeEnemyTarget } from "../src/utils/damage/enemyTargets.ts";
import { calculateWeaponDps, simulateTargetTtk } from "../src/utils/damage/simulator.ts";
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
    components: [{
      id: "AR-23 P",
      kind: "direct",
      standardDamage: 90,
      durableDamage: 22,
      armorPenetration: 2,
      damageType: "Ballistic",
      packetsPerShot: 1,
    }],
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
  assert.equal(profile.components[0].packetsPerShot, 9);
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
  assert.equal(result.timeToEmptySeconds, 6.88);
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

test("arc weapons use infobox cadence, barrels as arcs, and an infinite cycle", () => {
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
  assert.equal(profile.components[0].packetsPerShot, 5);
  assert.equal(profile.infiniteCapacity, true);
  assert.equal(result.burstDps.standard, 187.5);
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
    enemyName: "Test Enemy",
    anatomyName: "Standard",
    partName: "Main",
    difficulty: 7,
    armorValue: 3,
    durability: 0.5,
    explosionResistance: 0.25,
    mainHealth: 1600,
    partHealth: null,
    damageToMain: 1,
    damageToMainCapped: false,
    fatal: true,
    mainConstitution: null,
    partConstitution: null,
  });
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
    components: [
      {
        id: "direct",
        kind: "direct",
        standardDamage: 100,
        durableDamage: 20,
        armorPenetration: 1,
        damageType: "Ballistic",
        packetsPerShot: 1,
      },
      {
        id: "explosion",
        kind: "explosion",
        standardDamage: 200,
        durableDamage: 100,
        armorPenetration: 1,
        damageType: "Explosion",
        packetsPerShot: 1,
        radius: "inner",
      },
    ],
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
