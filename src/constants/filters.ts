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
] as const;

export type PropertyFilterName = (typeof PROPERTY_FILTERS)[number];

const FILTER_MATCHERS: Record<PropertyFilterName, RegExp> = {
  Unarmored: /\bunarmored\b/i,
  Light: /\blight\b/i,
  Medium: /\bmedium\b/i,
  Heavy: /\bheavy\b/i,
  "Anti-Tank": /\banti-tank\b/i,
  Explosive: /\bexplosive\b|\bexplosion\b/i,
  Gas: /\bgas\b/i,
  Fire: /\bfire\b/i,
  Ballistic: /\bballistic\b/i,
  Arc: /\barc\b/i,
};

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

export function itemMatchesPropertyFilters(item: Item | undefined, selectedFilters: readonly PropertyFilterName[]) {
  if (!selectedFilters?.length) {
    return true;
  }

  if (!item?.properties || !Object.keys(item.properties).length) {
    return false;
  }

  const searchableValues = collectPropertyValues(item.properties).join("\n");

  return selectedFilters.some((filterName) => FILTER_MATCHERS[filterName]?.test(searchableValues));
}

export function filterItemsByPropertyValues(items: Item[], selectedFilters: readonly PropertyFilterName[]) {
  return items.filter((item) => itemMatchesPropertyFilters(item, selectedFilters));
}
