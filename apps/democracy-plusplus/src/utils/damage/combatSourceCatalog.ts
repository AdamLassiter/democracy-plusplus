import type { Item } from "../../types";
import type { CombatSourceProfile, CombatSourceProfileResult } from "./types";

export const COMBAT_SOURCE_GROUPS = [
  "Primary",
  "Secondary",
  "Support weapon",
  "Dog backpack",
  "Exosuit and vehicle",
  "Emplacement and sentry",
  "Mine and placed explosive",
  "Eagle",
  "Orbital",
] as const;

export type CombatSourceGroup = (typeof COMBAT_SOURCE_GROUPS)[number];

export type CombatSourceOption = {
  item: Item;
  result: CombatSourceProfileResult;
};

export function isDogBackpack(option: CombatSourceOption) {
  return (
    option.item.tags?.includes("Backpacks") &&
    option.result.profiles.some(
      ({ delivery }) => delivery.kind === "autonomous-weapon",
    )
  );
}

export function combatSourceGroup(
  option: CombatSourceOption,
): CombatSourceGroup {
  if (option.item.category === "primary") return "Primary";
  if (option.item.category === "secondary") return "Secondary";
  if (isDogBackpack(option)) return "Dog backpack";
  if (/mine|c4|hellbomb/i.test(option.item.displayName))
    return "Mine and placed explosive";
  if (option.item.tags?.includes("Vehicles")) return "Exosuit and vehicle";
  if (option.item.category === "Defense") return "Emplacement and sentry";
  if (option.item.category === "Eagle") return "Eagle";
  if (option.item.category === "Orbital") return "Orbital";
  return "Support weapon";
}

export function combatSourceGroupOrder(option: CombatSourceOption) {
  return COMBAT_SOURCE_GROUPS.indexOf(combatSourceGroup(option));
}

export function usesBoundedExposure(profile: CombatSourceProfile) {
  return [
    "trap",
    "focused-strike",
    "distributed-strike",
    "persistent-area",
  ].includes(profile.delivery.kind);
}
