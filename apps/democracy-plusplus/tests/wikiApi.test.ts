import assert from "node:assert/strict";
import test from "node:test";

import {
  parseArmorPassivesPageSource,
  parseEnemyPageSource,
  parseFactionsPageSource,
  parseDemolitionPageSource,
  parseStructurePageSource,
  parseStratagemsPageSource,
} from "../scripts/wikiApi.ts";

test("parseStratagemsPageSource uses current template arguments for categories", async () => {
  const source = `
=== Offensive Permit ===
{{Stratagem Table|Orbital}}
{{Stratagem Table|Eagle}}
=== Supply Permit ===
{{Stratagem Table}}
{{Stratagem Table|Backpack}}
{{Stratagem Table|Vehicle}}
=== Defensive Permit ===
{{Stratagem Table|Sentry}}
{{Stratagem Table|Emplacement}}
{{Stratagem Table|Ship}}
`;
  function table(name: string) {
    return `
{| class="wikitable"
|-
| [[File:${name} Stratagem Icon Background.svg]] || [[${name}]] || [[File:Stratagem Arrow Up.svg]]
|}`;
  }
  const items = await parseStratagemsPageSource(source, async (template) => {
    const argument = template.match(/\|([^}]+)}}/)?.[1]?.trim();
    return table(argument || "Machine Gun");
  });

  assert.deepEqual(items.map((item) => item.stratagemTag), [
    "Orbital",
    "Eagle",
    "Weapons",
    "Backpacks",
    "Vehicles",
    "Sentry",
    "Emplacement",
  ]);
});

test("parseDemolitionPageSource reads structure targets, rowspans, and attack sources", () => {
  const source = `
{| class="wikitable"
! Faction !! Structure !! BaDR !! Demo Force
|-
| rowspan="2" | {{Automatons|text=Automatons}}
| [[Fabricator]] (Main) || Yes || 40
|-
| [[Fabricator]] (Vent) || No || 20
|}
{| class="wikitable"
|+ Support Weapons
! Source !! Attack !! Demo Force !! Explosive?
|-
| rowspan="2" | [[GR-8 Recoilless Rifle]]
| Projectile || 30 || No
|-
| Explosion || 40 || Yes
|}`;

  const parsed = parseDemolitionPageSource(source);
  assert.deepEqual(parsed.structures, [{
    id: "automatons-fabricator",
    displayName: "Fabricator",
    faction: "Automatons",
    description: "",
    wikiSlug: "Fabricator",
    imageFileTitle: null,
    targets: [
      { name: "Main", demolitionForce: 40, badr: true },
      { name: "Vent", demolitionForce: 20, badr: false },
    ],
  }]);
  assert.deepEqual(parsed.demolitionSources, [{
    displayName: "GR-8 Recoilless Rifle",
    wikiSlug: "GR-8_Recoilless_Rifle",
    category: "Support Weapons",
    attacks: [
      { name: "Projectile", demolitionForce: 30, explosive: false },
      { name: "Explosion", demolitionForce: 40, explosive: true },
    ],
  }]);
});

test("parseStructurePageSource adds infobox imagery and a lead description", () => {
  const parsed = parseStructurePageSource({
    title: "Fabricator",
    slug: "Fabricator",
    content: `{{Infobox Structure\n| image = Fabricator.png\n}}\nA factory that produces Automaton troops.\n\n== Anatomy ==`,
  }, {
    id: "automatons-fabricator",
    displayName: "Fabricator",
    faction: "Automatons",
    description: "",
    wikiSlug: "Fabricator",
    imageFileTitle: null,
    targets: [{ name: "Main", demolitionForce: 40, badr: true }],
  });

  assert.equal(parsed.imageFileTitle, "File:Fabricator.png");
  assert.equal(parsed.description, "A factory that produces Automaton troops.");
});

test("parseArmorPassivesPageSource reads div-based passive panels", async () => {
  const expanded = `
=== True Grit ===
<div class="armor-passive-panel"><div class="armor-passive-header">[[File:True Grit Armor Passive Icon.svg|class=armor-passive-icon|link=True Grit]] [[True Grit]]</div></div>
=== Oxygenator ===
<div class="armor-passive-panel"><div class="armor-passive-header">[[File:Oxygenator Armor Passive Icon.svg|class=armor-passive-icon|link=Oxygenator]] [[Oxygenator]]</div></div>
`;
  const items = await parseArmorPassivesPageSource("", async () => expanded);

  assert.deepEqual(items, [
    {
      displayName: "True Grit",
      wikiSlug: "True_Grit",
      imageFileTitle: "File:True Grit Armor Passive Icon.svg",
    },
    {
      displayName: "Oxygenator",
      wikiSlug: "Oxygenator",
      imageFileTitle: "File:Oxygenator Armor Passive Icon.svg",
    },
  ]);
});

test("parseFactionsPageSource assigns enemies to factions and subfactions", async () => {
  const source = `
== Terminids ==
{{Enemy Table|Terminids}}
=== Predator Strain ===
{{Enemy Table|Predator Strain}}
== Automatons ==
{{Enemy Table|Automatons}}
== Super Earth ==
{{Enemy Table|Super Earth Federation}}
`;
  const tables: Record<string, string> = {
    Terminids: `{| class="wikitable"\n|-\n| [[File:Stalker Enemy Icon.png]] || [[Stalker]] || Ambush predator.\n|}`,
    "Predator Strain": `{| class="wikitable"\n|-\n| [[File:Stalker Enemy Icon.png]] || [[Stalker]] || Ambush predator.\n|}`,
    Automatons: `{| class="wikitable"\n|-\n| [[File:Trooper Enemy Icon.png]] || [[Trooper]] || Light infantry.\n|}`,
    "Super Earth Federation": `{| class="wikitable"\n|-\n| [[File:Colonist.png]] || [[Colonist]] || Civilian.\n|}`,
  };

  const enemies = await parseFactionsPageSource(source, async (template) => {
    const tableName = template.match(/\|\s*([^}]+)}}/)?.[1]?.trim() ?? "";
    return tables[tableName] ?? "";
  });

  assert.deepEqual(enemies, [
    {
      displayName: "Stalker",
      wikiSlug: "Stalker",
      imageFileTitle: "File:Stalker Enemy Icon.png",
      description: "Ambush predator.",
      faction: "Terminids",
      subfactions: ["Predator Strain"],
    },
    {
      displayName: "Trooper",
      wikiSlug: "Trooper",
      imageFileTitle: "File:Trooper Enemy Icon.png",
      description: "Light infantry.",
      faction: "Automatons",
      subfactions: [],
    },
    {
      displayName: "Colonist",
      wikiSlug: "Colonist",
      imageFileTitle: "File:Colonist.png",
      description: "Civilian.",
      faction: "Super Earth",
      subfactions: [],
    },
  ]);
});

test("parseEnemyPageSource reads anatomy tabs, armor values, and variants", () => {
  const content = `
{{Infobox Enemy
| image = Test Enemy Icon.png
| class = Heavy
| description = A test enemy.
}}
== Anatomy ==
<tabber>
|-| Intact =
{{Anatomy Table|
  {{Anatomy Row
    | part_name = Head<br>Plate
    | health = 500
    | av = 4
    | av6 = 5
    | durability = 75%
  }}
}}
|-| Broken =
{{Anatomy Table|
  {{Anatomy Row
    | part_name = Exposed Head
    | health = Main
    | av = 1
    | durability = 20%
  }}
}}
</tabber>
== Variants ==
<gallery>
Test Variant Enemy Icon.png|[[Test Variant]]
</gallery>
== Gallery ==
`;

  const enemy = parseEnemyPageSource(
    { title: "Test Enemy", slug: "Test_Enemy", content },
    {
      displayName: "Test Enemy",
      wikiSlug: "Test_Enemy",
      imageFileTitle: "File:Fallback.png",
      faction: "Automatons",
      subfactions: ["Test Corps"],
      description: "Fallback description",
    },
  );

  assert.equal(enemy.enemyClass, "Heavy");
  assert.equal(enemy.description, "A test enemy.");
  assert.equal(enemy.imageFileTitle, "File:Test Enemy Icon.png");
  assert.deepEqual(enemy.anatomy, [
    {
      name: "Intact",
      parts: [{
        name: "Head Plate",
        armor: "4",
        armorByDifficulty: { "6": "5" },
        health: "500",
        durability: "75%",
      }],
    },
    {
      name: "Broken",
      parts: [{ name: "Exposed Head", armor: "1", health: "Main", durability: "20%" }],
    },
  ]);
  assert.deepEqual(enemy.variants, [{
    displayName: "Test Variant",
    wikiSlug: "Test_Variant",
    imageFileTitle: "File:Test Variant Enemy Icon.png",
  }]);
});
