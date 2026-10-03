import type { Item, PropertyValue } from "../types";

export const PROPERTY_FILTERS = [
  "Unarmored",
  "Light",
  "Medium",
  "Heavy",
  "Anti-Tank",
  "Demo Force 30+",
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

export const DETAILED_DEMOLITION_FORCE_FILTERS = [
  "Demo Force 10",
  "Demo Force 20",
  "Demo Force 30",
  "Demo Force 40",
  "Demo Force 50",
  "Demo Force 60",
] as const;

type DetailedAntiTankFilterName = (typeof DETAILED_ANTI_TANK_FILTERS)[number];
type DetailedDemolitionForceFilterName = (typeof DETAILED_DEMOLITION_FORCE_FILTERS)[number];
const GROUPED_DEMOLITION_FORCE_FILTERS: readonly DetailedDemolitionForceFilterName[] = [
  "Demo Force 30",
  "Demo Force 40",
  "Demo Force 50",
  "Demo Force 60",
];

export type PropertyFilterName =
  | (typeof PROPERTY_FILTERS)[number]
  | DetailedAntiTankFilterName
  | DetailedDemolitionForceFilterName;

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
const DEMOLITION_FORCE_FILTERS = new Set<PropertyFilterName>([
  "Demo Force 30+",
  ...DETAILED_DEMOLITION_FORCE_FILTERS,
]);

const FILTER_MATCHERS: Partial<Record<PropertyFilterName, RegExp>> = {
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

function isDetailedDemolitionForceFilter(
  filterName: PropertyFilterName,
): filterName is DetailedDemolitionForceFilterName {
  return DETAILED_DEMOLITION_FORCE_FILTERS.includes(filterName as DetailedDemolitionForceFilterName);
}

function replaceGroupedFilter(
  filters: PropertyFilterName[],
  groupedFilter: PropertyFilterName,
  detailedFilters: readonly PropertyFilterName[],
) {
  const index = filters.indexOf(groupedFilter);
  if (index !== -1) filters.splice(index, 1, ...detailedFilters);
}

export function getPropertyFilters(
  detailedAntiTank: boolean,
  detailedDemolitionForce = false,
): readonly PropertyFilterName[] {
  const filters: PropertyFilterName[] = [...PROPERTY_FILTERS];
  if (detailedAntiTank) {
    replaceGroupedFilter(filters, "Anti-Tank", DETAILED_ANTI_TANK_FILTERS);
  }
  if (detailedDemolitionForce) {
    replaceGroupedFilter(filters, "Demo Force 30+", DETAILED_DEMOLITION_FORCE_FILTERS);
  }
  return filters;
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

export function normalizePropertyFilters(
  selectedFilters: readonly PropertyFilterName[],
  detailedAntiTank: boolean,
  detailedDemolitionForce: boolean,
): PropertyFilterName[] {
  const normalized = normalizeAntiTankFilters(selectedFilters, detailedAntiTank);
  const detailedSelected = normalized.some(isDetailedDemolitionForceFilter);

  if (detailedDemolitionForce && normalized.includes("Demo Force 30+")) {
    return [...new Set<PropertyFilterName>([
      ...normalized.filter((filterName) => filterName !== "Demo Force 30+"),
      ...GROUPED_DEMOLITION_FORCE_FILTERS,
    ])];
  }

  if (!detailedDemolitionForce && detailedSelected) {
    const hasGroupedEquivalent = normalized.some((filterName) =>
      GROUPED_DEMOLITION_FORCE_FILTERS.includes(filterName as DetailedDemolitionForceFilterName),
    );
    return [...new Set<PropertyFilterName>([
      ...normalized.filter((filterName) => !isDetailedDemolitionForceFilter(filterName)),
      ...(hasGroupedEquivalent ? ["Demo Force 30+" as const] : []),
    ])];
  }

  return normalized;
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

function collectDemolitionForceValues(value: PropertyValue, output: number[] = []) {
  if (!value || typeof value !== "object") return output;

  if (Array.isArray(value)) {
    value.forEach((nestedValue) => collectDemolitionForceValues(nestedValue, output));
    return output;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (key.toLowerCase() === "demolition force") {
      const values = Array.isArray(nestedValue) ? nestedValue : [nestedValue];
      values.forEach((entry) => {
        if (typeof entry !== "string" && typeof entry !== "number") return;
        const match = String(entry).match(/-?\d+(?:\.\d+)?/);
        if (match) output.push(Number.parseFloat(match[0]));
      });
      return;
    }
    collectDemolitionForceValues(nestedValue, output);
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
  const demolitionForceValues = properties ? collectDemolitionForceValues(properties) : [];

  return selectedFilters.some((filterName) => {
    if (DEMOLITION_FORCE_FILTERS.has(filterName)) {
      if (filterName === "Demo Force 30+") {
        return demolitionForceValues.some((value) => value >= 30);
      }
      const requiredForce = Number.parseInt(filterName.replace("Demo Force ", ""), 10);
      return demolitionForceValues.includes(requiredForce);
    }
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
