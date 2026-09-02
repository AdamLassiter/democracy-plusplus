import assert from "node:assert/strict";
import test from "node:test";

import { parseArmorPassivesPageSource, parseStratagemsPageSource } from "../scripts/wikiApi.ts";

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
