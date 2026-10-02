import type { Item, PropertyValue } from "../types";

export const PROPERTY_FILTERS = [
  "Unarmored",
  "Light",
  "Medium",
  "Heavy",
  "Anti-Tank",
  "Ballistic",
  "Explosive",
  "Fire",
  "Gas",
  "Arc",
  "Laser",
  "Stealth",
  "Stun",
] as const;

export const DAMAGE_TYPE_FILTERS = [
  "Ballistic",
  "Explosive",
  "Fire",
  "Gas",
  "Arc",
  "Laser",
] as const satisfies readonly PropertyFilterName[];

export const DETAILED_ANTI_TANK_FILTERS = [
  "Anti-Tank 1",
  "Anti-Tank 2",
  "Anti-Tank 3",
  "Anti-Tank 4",
  "Anti-Tank 5",
  "Anti-Tank 6",
] as const;

const NON_ANTI_TANK_FILTERS = PROPERTY_FILTERS.filter((filterName) => filterName !== "Anti-Tank");
type DetailedAntiTankFilterName = (typeof DETAILED_ANTI_TANK_FILTERS)[number];

export type PropertyFilterName =
  | (typeof PROPERTY_FILTERS)[number]
  | DetailedAntiTankFilterName;

const PENETRATION_FILTERS = new Set<PropertyFilterName>([
  "Unarmored",
  "Light",
  "Medium",
  "Heavy",
  "Anti-Tank",
  ...DETAILED_ANTI_TANK_FILTERS,
]);
const PENETRATION_ANGLE_KEYS = new Set([
  "direct",
  "slight angle",
  "large angle",
  "extreme angle",
]);

const FILTER_MATCHERS: Record<PropertyFilterName, RegExp> = {
  Unarmored: /\bunarmored\b|\bvery light\b/i,
  Light: /(?<!very )\blight\b/i,
  Medium: /\bmedium\b/i,
  Heavy: /\bheavy\b/i,
  "Anti-Tank": /\banti-tank\b/i,
  "Anti-Tank 1": /\banti-tank (?:i|1)\b/i,
  "Anti-Tank 2": /\banti-tank (?:ii|2)\b/i,
  "Anti-Tank 3": /\banti-tank (?:iii|3)\b/i,
  "Anti-Tank 4": /\banti-tank (?:iv|4)\b/i,
  "Anti-Tank 5": /\banti-tank (?:v|5)\b/i,
  "Anti-Tank 6": /\banti-tank (?:vi|6)\b/i,
  Explosive: /\bexplosive\b|\bexplosion\b/i,
  Gas: /\bgas\b/i,
  Fire: /\bfire\b/i,
  Ballistic: /\bballistic\b/i,
  Arc: /\barc\b/i,
  Laser: /\blaser\b/i,
  Stealth: /\bstealth\b|\bsuppressed\b/i,
  Stun: /\bstun\b/i,
};

function isDetailedAntiTankFilter(filterName: PropertyFilterName): filterName is DetailedAntiTankFilterName {
  return DETAILED_ANTI_TANK_FILTERS.includes(filterName as DetailedAntiTankFilterName);
}

export function getPropertyFilters(detailedAntiTank: boolean): readonly PropertyFilterName[] {
  if (!detailedAntiTank) {
    return PROPERTY_FILTERS;
  }

  const antiTankIndex = PROPERTY_FILTERS.indexOf("Anti-Tank");
  return [
    ...NON_ANTI_TANK_FILTERS.slice(0, antiTankIndex),
    ...DETAILED_ANTI_TANK_FILTERS,
    ...NON_ANTI_TANK_FILTERS.slice(antiTankIndex),
  ];
}

export function normalizeAntiTankFilters(
  selectedFilters: readonly PropertyFilterName[],
  detailedAntiTank: boolean,
): PropertyFilterName[] {
  const detailedSelected = selectedFilters.some(isDetailedAntiTankFilter);

  if (detailedAntiTank && selectedFilters.includes("Anti-Tank")) {
    return [...new Set<PropertyFilterName>([
      ...selectedFilters.filter((filterName) => filterName !== "Anti-Tank"),
      ...DETAILED_ANTI_TANK_FILTERS,
    ])];
  }

  if (!detailedAntiTank && detailedSelected) {
    return [...new Set<PropertyFilterName>([
      ...selectedFilters.filter((filterName) => !isDetailedAntiTankFilter(filterName)),
      "Anti-Tank",
    ])];
  }

  return [...selectedFilters];
}

function collectPropertyValues(value: PropertyValue, output: string[] = []) {
  if (value === null || value === undefined) {
    return output;
  }

  if (typeof value !== "object") {
    output.push(String(value));
    return output;
  }

  Object.values(value).forEach((nestedValue) => {
    collectPropertyValues(nestedValue, output);
  });

  return output;
}

function collectPenetrationValues(value: PropertyValue, output: string[] = []) {
  if (!value || typeof value !== "object") {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((nestedValue) => collectPenetrationValues(nestedValue, output));
    return output;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (key.toLowerCase() !== "penetration") {
      collectPenetrationValues(nestedValue, output);
      return;
    }
    if (!nestedValue || typeof nestedValue !== "object" || Array.isArray(nestedValue)) {
      return;
    }

    Object.entries(nestedValue).forEach(([penetrationKey, penetrationValue]) => {
      if (PENETRATION_ANGLE_KEYS.has(penetrationKey.toLowerCase())) {
        collectPropertyValues(penetrationValue, output);
      }
    });
  });

  return output;
}

export function itemMatchesPropertyFilters(item: Item | undefined, selectedFilters: readonly PropertyFilterName[]) {
  if (!selectedFilters?.length) {
    return true;
  }

  const properties = item?.properties;
  const searchableValues = properties ? collectPropertyValues(properties).join("\n") : "";
  const penetrationValues = properties ? collectPenetrationValues(properties).join("\n") : "";

  return selectedFilters.some((filterName) => {
    const penetrationFilter = PENETRATION_FILTERS.has(filterName);
    if (!penetrationFilter && item?.tags?.includes(filterName)) {
      return true;
    }
    return FILTER_MATCHERS[filterName]?.test(
      penetrationFilter ? penetrationValues : searchableValues,
    );
  });
}

export function filterItemsByPropertyValues(items: Item[], selectedFilters: readonly PropertyFilterName[]) {
  return items.filter((item) => itemMatchesPropertyFilters(item, selectedFilters));
}
