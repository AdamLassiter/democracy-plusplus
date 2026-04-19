import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Faction, MissionLength, ObjectiveTag, Tier } from "../src/types.ts";

type JsonObject = Record<string, any>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const IMAGES_DIR = path.join(ROOT, "public", "images");

const TIERS = ["s", "a", "b", "c", "d"] as const satisfies readonly Tier[];
const FACTIONS = ["Terminids", "Automatons", "Illuminate"] as const satisfies readonly Faction[];
const OBJECTIVE_TAGS = ["Eradicate", "Commando", "Blitz"] as const satisfies readonly ObjectiveTag[];
const MISSION_LENGTHS = ["short", "long"] as const satisfies readonly MissionLength[];
const STRATAGEM_DIRECTIONS = ["Up", "Down", "Left", "Right"] as const;

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, fileName), "utf8")) as T;
}

function asObject(value: unknown, context: string): JsonObject {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${context} must be an object`);
  return value as JsonObject;
}

function assertAllowedKeys(
  item: JsonObject,
  allowedKeys: readonly string[],
  context: string,
) {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(item).filter((key) => !allowed.has(key));
  assert.deepEqual(unexpected, [], `${context} has unexpected key(s): ${unexpected.join(", ")}`);
}

function assertRequiredKeys(
  item: JsonObject,
  requiredKeys: readonly string[],
  context: string,
) {
  const missing = requiredKeys.filter((key) => !(key in item));
  assert.deepEqual(missing, [], `${context} is missing required key(s): ${missing.join(", ")}`);
}

function expectString(value: unknown, context: string) {
  assert.equal(typeof value, "string", `${context} must be a string`);
  assert.notEqual((value as string).trim(), "", `${context} must not be empty`);
}

function expectOptionalString(value: unknown, context: string) {
  if (value !== undefined && value !== null) {
    expectString(value, context);
  }
}

function expectStringArray(value: unknown, context: string, minimumLength = 0) {
  assert.ok(Array.isArray(value), `${context} must be an array`);
  assert.ok(value.length >= minimumLength, `${context} must contain at least ${minimumLength} item(s)`);
  value.forEach((entry, index) => expectString(entry, `${context}[${index}]`));
}

function expectNumberArray(value: unknown, context: string, minimumLength = 0) {
  assert.ok(Array.isArray(value), `${context} must be an array`);
  assert.ok(value.length >= minimumLength, `${context} must contain at least ${minimumLength} item(s)`);
  value.forEach((entry, index) => {
    assert.equal(typeof entry, "number", `${context}[${index}] must be a number`);
    assert.ok(Number.isFinite(entry), `${context}[${index}] must be finite`);
  });
}

function expectTier(value: unknown, context: string) {
  assert.ok(TIERS.includes(value as Tier), `${context} must be one of ${TIERS.join(", ")}`);
}

function expectOptionalTier(value: unknown, context: string) {
  if (value !== null && value !== undefined) {
    expectTier(value, context);
  }
}

function expectImagePath(value: unknown, context: string) {
  expectString(value, context);
  const imagePath = path.join(IMAGES_DIR, value as string);
  assert.ok(existsSync(imagePath), `${context} points to a missing file: ${value}`);
}

function assertUnique(values: string[], context: string) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `${context} contains duplicate value(s): ${duplicates.join(", ")}`);
}

const warbonds = readJson<JsonObject[]>("warbonds.json");
const factions = readJson<string[]>("factions.json");
const objectives = readJson<JsonObject[]>("objectives.json");
const warbondCodes = warbonds.map((warbond, index) => {
  const context = `warbonds[${index}]`;
  const item = asObject(warbond, context);
  assertAllowedKeys(
    item,
    ["displayName", "type", "category", "tags", "warbondCode", "internalName", "imageUrl", "tier"],
    context,
  );
  assertRequiredKeys(
    item,
    ["displayName", "type", "category", "tags", "warbondCode", "internalName", "imageUrl", "tier"],
    context,
  );
  expectString(item.displayName, `${context}.displayName`);
  assert.equal(item.type, "Warbond", `${context}.type must be Warbond`);
  assert.equal(item.category, "", `${context}.category must be an empty string`);
  expectStringArray(item.tags, `${context}.tags`);
  expectString(item.warbondCode, `${context}.warbondCode`);
  expectString(item.internalName, `${context}.internalName`);
  assert.equal(typeof item.imageUrl, "string", `${context}.imageUrl must be a string`);
  expectTier(item.tier, `${context}.tier`);
  return item.warbondCode as string;
});

const itemDatasetConfigs = [
  { fileName: "armor_passives.json", expectedCategory: "armor", expectedType: "Equipment" },
  { fileName: "boosters.json", expectedCategory: "booster", expectedType: "Equipment" },
  { fileName: "primaries.json", expectedCategory: "primary", expectedType: "Equipment" },
  { fileName: "secondaries.json", expectedCategory: "secondary", expectedType: "Equipment" },
  { fileName: "throwables.json", expectedCategory: "throwable", expectedType: "Equipment" },
  { fileName: "stratagems.json", expectedCategory: null, expectedType: "Stratagem" },
] as const;
const itemDatasets = itemDatasetConfigs.map((config) => ({
  ...config,
  data: readJson<JsonObject[]>(config.fileName),
}));
const allItems = itemDatasets.flatMap((dataset) => dataset.data);

test("public data files use valid schema keys and value types", async (t) => {
  await t.test("factions.json matches the supported faction list", () => {
    assert.deepEqual(factions, [...FACTIONS]);
  });

  await t.test("difficulties.json contains valid difficulty rows", () => {
    const data = readJson<unknown>("difficulties.json");
    assert.ok(Array.isArray(data), "difficulties.json must be an array");

    data.forEach((entry, index) => {
      const context = `difficulties[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(item, ["displayName", "missions", "tier"], context);
      assertRequiredKeys(item, ["displayName", "missions", "tier"], context);
      expectString(item.displayName, `${context}.displayName`);
      assert.equal(typeof item.missions, "number", `${context}.missions must be a number`);
      assert.ok(Number.isInteger(item.missions), `${context}.missions must be an integer`);
      assert.ok(item.missions >= 1 && item.missions <= 3, `${context}.missions must be between 1 and 3`);
      assert.equal(typeof item.tier, "number", `${context}.tier must be a number`);
      assert.ok(Number.isInteger(item.tier), `${context}.tier must be an integer`);
      assert.ok(item.tier >= 1 && item.tier <= 10, `${context}.tier must be between 1 and 10`);
    });
  });

  await t.test("warbonds.json contains unique valid warbond definitions", () => {
    assert.ok(warbonds.length > 0, "warbonds.json must not be empty");
    assertUnique(warbondCodes, "warbondCodes");
    assert.ok(warbondCodes.includes("none"), "warbondCodes must include none");
  });

  await t.test("equipment and stratagem datasets contain valid items", () => {
    const allDisplayNames: string[] = [];
    const allInternalNames: string[] = [];

    for (const config of itemDatasetConfigs) {
      const data = readJson<unknown>(config.fileName);
      assert.ok(Array.isArray(data), `${config.fileName} must be an array`);

      data.forEach((entry, index) => {
        const context = `${config.fileName}[${index}]`;
        const item = asObject(entry, context);
        assertAllowedKeys(
          item,
          [
            "displayName",
            "type",
            "category",
            "tags",
            "warbondCode",
            "internalName",
            "imageUrl",
            "tier",
            "wikiSlug",
            "wikiImageUrl",
            "properties",
            "overrideCost",
            "stratagemCode",
          ],
          context,
        );
        assertRequiredKeys(
          item,
          [
            "displayName",
            "type",
            "category",
            "tags",
            "warbondCode",
            "internalName",
            "imageUrl",
            "tier",
          ],
          context,
        );

        expectString(item.displayName, `${context}.displayName`);
        expectString(item.internalName, `${context}.internalName`);
        expectString(item.warbondCode, `${context}.warbondCode`);
        expectImagePath(item.imageUrl, `${context}.imageUrl`);
        expectTier(item.tier, `${context}.tier`);
        expectStringArray(item.tags, `${context}.tags`);
        expectOptionalString(item.wikiSlug, `${context}.wikiSlug`);
        expectOptionalString(item.wikiImageUrl, `${context}.wikiImageUrl`);

        if (item.properties !== undefined) {
          asObject(item.properties, `${context}.properties`);
        }

        if (item.overrideCost !== undefined) {
          assert.equal(typeof item.overrideCost, "number", `${context}.overrideCost must be a number`);
          assert.ok(item.overrideCost > 0, `${context}.overrideCost must be positive`);
        }

        if (config.expectedCategory) {
          assert.equal(item.type, config.expectedType, `${context}.type must be ${config.expectedType}`);
          assert.equal(item.category, config.expectedCategory, `${context}.category must be ${config.expectedCategory}`);
        } else {
          assert.equal(item.type, "Stratagem", `${context}.type must be Stratagem`);
          assert.ok(
            ["Supply", "Eagle", "Defense", "Orbital"].includes(item.category as string),
            `${context}.category must be a valid stratagem category`,
          );
        }

        if (item.stratagemCode !== undefined) {
          assert.ok(Array.isArray(item.stratagemCode), `${context}.stratagemCode must be an array`);
          assert.ok(item.stratagemCode.length > 0, `${context}.stratagemCode must not be empty`);
          item.stratagemCode.forEach((direction, directionIndex) => {
            assert.ok(
              STRATAGEM_DIRECTIONS.includes(direction),
              `${context}.stratagemCode[${directionIndex}] must be a valid direction`,
            );
          });
        } else {
          assert.notEqual(config.fileName, "stratagems.json", `${context}.stratagemCode should be present on stratagems`);
        }

        allDisplayNames.push(item.displayName as string);
        allInternalNames.push(item.internalName as string);
      });
    }

    assertUnique(allDisplayNames, "item display names");
    assertUnique(allInternalNames, "item internal names");
  });

  await t.test("objectives.json contains valid objective definitions", () => {
    const displayNames: string[] = [];

    objectives.forEach((entry, index) => {
      const context = `objectives[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(
        item,
        ["displayName", "tier", "wikiSlug", "tags", "minDifficulty", "maxDifficulty", "missionLength"],
        context,
      );
      assertRequiredKeys(item, ["displayName", "tier", "minDifficulty", "maxDifficulty", "missionLength"], context);
      expectString(item.displayName, `${context}.displayName`);
      expectOptionalString(item.wikiSlug, `${context}.wikiSlug`);
      assert.equal(typeof item.minDifficulty, "number", `${context}.minDifficulty must be a number`);
      assert.equal(typeof item.maxDifficulty, "number", `${context}.maxDifficulty must be a number`);
      assert.ok(Number.isInteger(item.minDifficulty), `${context}.minDifficulty must be an integer`);
      assert.ok(Number.isInteger(item.maxDifficulty), `${context}.maxDifficulty must be an integer`);
      assert.ok(item.minDifficulty >= 1, `${context}.minDifficulty must be at least 1`);
      assert.ok(item.maxDifficulty <= 10, `${context}.maxDifficulty must be at most 10`);
      assert.ok(item.minDifficulty <= item.maxDifficulty, `${context}.minDifficulty must be <= maxDifficulty`);
      assert.ok(
        MISSION_LENGTHS.includes(item.missionLength as MissionLength),
        `${context}.missionLength must be short or long`,
      );

      const tier = asObject(item.tier, `${context}.tier`);
      assert.deepEqual(Object.keys(tier).sort(), [...FACTIONS].sort(), `${context}.tier must include every faction`);
      for (const faction of FACTIONS) {
        expectOptionalTier(tier[faction], `${context}.tier.${faction}`);
      }

      if (item.tags !== undefined) {
        expectStringArray(item.tags, `${context}.tags`);
        (item.tags as unknown[]).forEach((tag, tagIndex) => {
          assert.ok(
            [...FACTIONS, ...OBJECTIVE_TAGS].includes(tag as Faction | ObjectiveTag),
            `${context}.tags[${tagIndex}] must be a valid faction or objective tag`,
          );
        });
      }

      displayNames.push(item.displayName as string);
    });

    assertUnique(displayNames, "objective display names");
  });

  await t.test("quests.json contains valid quest definitions", () => {
    const data = readJson<unknown>("quests.json");
    assert.ok(Array.isArray(data), "quests.json must be an array");

    const displayNames: string[] = [];

    data.forEach((entry, index) => {
      const context = `quests[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(
        item,
        [
          "displayName",
          "description",
          "descriptions",
          "type",
          "category",
          "datatype",
          "tags",
          "values",
          "shortValues",
          "rewards",
        ],
        context,
      );
      assertRequiredKeys(item, ["displayName", "descriptions", "type", "category", "values", "rewards"], context);
      expectString(item.displayName, `${context}.displayName`);
      assert.equal(item.type, "objective", `${context}.type must be objective`);
      expectString(item.category, `${context}.category`);
      expectOptionalString(item.description, `${context}.description`);
      expectStringArray(item.descriptions, `${context}.descriptions`, 3);
      assert.equal((item.descriptions as unknown[]).length, 3, `${context}.descriptions must contain exactly 3 entries`);
      expectNumberArray(item.values, `${context}.values`, 1);
      expectNumberArray(item.rewards, `${context}.rewards`, 1);

      if (item.shortValues !== undefined) {
        expectNumberArray(item.shortValues, `${context}.shortValues`, 1);
      }
      if (item.datatype !== undefined) {
        assert.equal(item.datatype, "float", `${context}.datatype must be float`);
      }
      if (item.tags !== undefined) {
        expectStringArray(item.tags, `${context}.tags`);
      }

      displayNames.push(item.displayName as string);
    });

    assertUnique(displayNames, "quest display names");
  });

  await t.test("restrictions.json contains valid restriction definitions", () => {
    const data = readJson<unknown>("restrictions.json");
    assert.ok(Array.isArray(data), "restrictions.json must be an array");

    const displayNames: string[] = [];

    data.forEach((entry, index) => {
      const context = `restrictions[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(
        item,
        ["displayName", "description", "descriptions", "type", "category", "tags", "tier"],
        context,
      );
      assertRequiredKeys(item, ["displayName", "descriptions", "type", "category", "tier"], context);
      expectString(item.displayName, `${context}.displayName`);
      assert.equal(item.type, "restriction", `${context}.type must be restriction`);
      expectString(item.category, `${context}.category`);
      expectOptionalString(item.description, `${context}.description`);
      expectStringArray(item.descriptions, `${context}.descriptions`, 3);
      assert.equal((item.descriptions as unknown[]).length, 3, `${context}.descriptions must contain exactly 3 entries`);
      expectOptionalTier(item.tier, `${context}.tier`);
      if (item.tags !== undefined) {
        expectStringArray(item.tags, `${context}.tags`);
      }

      displayNames.push(item.displayName as string);
    });

    assertUnique(displayNames, "restriction display names");
  });

  await t.test("forms.json contains valid form templates", () => {
    const data = readJson<unknown>("forms.json");
    assert.ok(Array.isArray(data), "forms.json must be an array");

    const titles: string[] = [];

    data.forEach((entry, index) => {
      const context = `forms[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(item, ["title", "subtitle", "possibleFields"], context);
      assertRequiredKeys(item, ["title", "subtitle", "possibleFields"], context);
      expectString(item.title, `${context}.title`);
      expectString(item.subtitle, `${context}.subtitle`);
      assert.ok(Array.isArray(item.possibleFields), `${context}.possibleFields must be an array`);
      assert.ok(item.possibleFields.length > 0, `${context}.possibleFields must not be empty`);

      item.possibleFields.forEach((field, fieldIndex) => {
        const fieldContext = `${context}.possibleFields[${fieldIndex}]`;
        const fieldObject = asObject(field, fieldContext);
        assertAllowedKeys(fieldObject, ["label", "success", "warning", "error"], fieldContext);
        assertRequiredKeys(fieldObject, ["label", "success", "warning", "error"], fieldContext);
        expectString(fieldObject.label, `${fieldContext}.label`);
        expectStringArray(fieldObject.success, `${fieldContext}.success`, 1);
        expectStringArray(fieldObject.warning, `${fieldContext}.warning`, 1);
        expectStringArray(fieldObject.error, `${fieldContext}.error`, 1);
      });

      titles.push(item.title as string);
    });

    assertUnique(titles, "form titles");
  });

  await t.test("achievements.json contains unique valid achievements", () => {
    const data = readJson<unknown>("achievements.json");
    assert.ok(Array.isArray(data), "achievements.json must be an array");

    const ids: string[] = [];

    data.forEach((entry, index) => {
      const context = `achievements[${index}]`;
      const item = asObject(entry, context);
      assertAllowedKeys(item, ["id", "displayName", "description"], context);
      assertRequiredKeys(item, ["id", "displayName", "description"], context);
      expectString(item.id, `${context}.id`);
      expectString(item.displayName, `${context}.displayName`);
      expectString(item.description, `${context}.description`);
      ids.push(item.id as string);
    });

    assertUnique(ids, "achievement ids");
  });

  await t.test("cross-json references stay consistent", async (crossJson) => {
    await crossJson.test("all item warbond references exist in warbonds.json", () => {
      allItems.forEach((entry, index) => {
        const item = asObject(entry, `allItems[${index}]`);
        const warbondCode = item.warbondCode;
        assert.equal(typeof warbondCode, "string", `allItems[${index}].warbondCode must be a string`);
        assert.ok(
          warbondCodes.includes(warbondCode),
          `${item.displayName as string} references missing warbondCode: ${warbondCode}`,
        );
      });
    });

    await crossJson.test("every non-default warbond is referenced by at least one item", () => {
      const referencedWarbondCodes = new Set(
        allItems
          .map((item) => item.warbondCode)
          .filter((warbondCode): warbondCode is string => typeof warbondCode === "string" && warbondCode !== "none"),
      );

      warbonds.forEach((entry, index) => {
        const warbond = asObject(entry, `warbonds[${index}]`);
        const warbondCode = warbond.warbondCode as string;
        if (warbondCode === "none") {
          return;
        }

        assert.ok(
          referencedWarbondCodes.has(warbondCode),
          `warbonds.json contains an unreferenced warbondCode: ${warbondCode}`,
        );
      });
    });

    await crossJson.test("objective faction tags and tier maps match factions.json", () => {
      objectives.forEach((entry, index) => {
        const objective = asObject(entry, `objectives[${index}]`);
        const tierMap = asObject(objective.tier, `objectives[${index}].tier`);
        const taggedFactions = new Set(
          ((objective.tags as any[] | undefined) ?? []).filter((tag): tag is string => factions.includes(tag)),
        );

        assert.deepEqual(
          Object.keys(tierMap).sort(),
          [...factions].sort(),
          `objectives[${index}].tier keys must match factions.json exactly`,
        );

        taggedFactions.forEach((faction) => {
          assert.notEqual(
            tierMap[faction],
            null,
            `${objective.displayName as string} tags faction ${faction} but has no tier for it`,
          );
        });
      });
    });
  });
});
