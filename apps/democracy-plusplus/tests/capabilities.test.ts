import assert from "node:assert/strict";
import test from "node:test";
import type { AttackCapability, EnemyAnatomy, Item } from "../src/types.ts";
import {
  anatomyCoverage,
  bestEnemyCoverage,
  enemyAnatomyCoverageState,
  extractItemCapabilities,
  parsePenetration,
  structureCoverage,
} from "../src/utils/capabilities.ts";

test("penetration labels preserve the complete unarmored through anti-tank scale", () => {
  assert.deepEqual([
    "Unarmored", "Very Light", "Light", "Medium", "Heavy",
    "Anti-Tank I", "Anti-Tank 2", "Anti-Tank VI",
  ].map(parsePenetration), [0, 1, 2, 3, 4, 5, 6, 10]);
});

test("enemy coverage distinguishes resisted equality from strict penetration", () => {
  const anatomy: EnemyAnatomy = {
    name: "Standard",
    parts: [
      { name: "Light", armor: "2", health: "100", durability: "0%" },
      { name: "Heavy", armor: "4", health: "200", durability: "0%" },
    ],
  };
  function capability(armorPenetration: number): AttackCapability {
    return {
      itemName: "Test weapon",
      attackName: "Projectile",
      armorPenetration,
      demolitionForce: null,
      explosive: false,
    };
  }

  assert.equal(enemyAnatomyCoverageState(anatomy, [capability(1)], 1), "none");
  assert.equal(enemyAnatomyCoverageState(anatomy, [capability(2)], 1), "partialResisted");
  assert.equal(enemyAnatomyCoverageState(anatomy, [capability(3)], 1), "partial");
  assert.equal(enemyAnatomyCoverageState(anatomy, [capability(4)], 1), "fullResisted");
  assert.equal(enemyAnatomyCoverageState(anatomy, [capability(5)], 1), "full");
  assert.equal(bestEnemyCoverage(["partialResisted", "fullResisted", "partial"]), "fullResisted");
});

test("enemy coverage uses per-difficulty armor and reports partial coverage", () => {
  const anatomy: EnemyAnatomy = {
    name: "Standard",
    parts: [
      { name: "Head", armor: "3", armorByDifficulty: { "6": "5" }, health: "100", durability: "0%" },
      { name: "Body", armor: "4", health: "200", durability: "50%" },
    ],
  };
  const capability: AttackCapability = {
    itemName: "Test rifle", attackName: "Projectile", armorPenetration: 4,
    demolitionForce: null, explosive: false,
  };

  assert.equal(anatomyCoverage(anatomy, [capability], 5).state, "full");
  const difficultySix = anatomyCoverage(anatomy, [capability], 6);
  assert.equal(difficultySix.state, "partial");
  assert.equal(difficultySix.parts[0].covered, false);
});

test("structure coverage requires sufficient demolition force and explosive BaDR", () => {
  const targets = [
    { name: "Wall", demolitionForce: 20, badr: false },
    { name: "Core", demolitionForce: 30, badr: true },
  ];
  const nonExplosive: AttackCapability = {
    itemName: "Railgun", attackName: "Projectile", armorPenetration: 6,
    demolitionForce: 40, explosive: false,
  };
  const partial = structureCoverage(targets, [nonExplosive]);
  assert.equal(partial.state, "partial");
  assert.equal(partial.targets[1].failureReason, "BaDR requires an explosive attack");

  const explosive = { ...nonExplosive, itemName: "Rocket", attackName: "Explosion", explosive: true };
  assert.equal(structureCoverage(targets, [nonExplosive, explosive]).state, "full");
  assert.equal(structureCoverage(targets, []).state, "none");
});

test("wiki demolition sources override inferred item attack values", () => {
  const item: Item = {
    displayName: "Test launcher",
    tier: "a",
    properties: {
      Projectile: {
        Penetration: { Direct: "Anti-Tank III" },
        Damage: { "Demolition Force": "10" },
      },
    },
  };
  const capabilities = extractItemCapabilities(item, {
    displayName: "Test launcher",
    wikiSlug: "Test_launcher",
    category: "Launchers",
    attacks: [{ name: "Projectile", demolitionForce: 35, explosive: true }],
  });

  assert.deepEqual(capabilities, [{
    itemName: "Test launcher",
    attackName: "Projectile",
    armorPenetration: 7,
    demolitionForce: 35,
    explosive: true,
  }]);
});
