import type { Item } from "../../types";
import type {
  CombatSourceProfile,
  CombatSourceProfileResult,
  WeaponProfile,
} from "./types.ts";
import { extractStratagemProfiles } from "./stratagemProfiles.ts";
import { extractWeaponProfiles } from "./weaponProfiles.ts";

function carriedWeapon(profile: WeaponProfile): CombatSourceProfile {
  return {
    ...profile,
    sourceKind: "weapon",
    delivery: {
      kind: "carried-weapon",
      control: "player",
      totalPayloads: profile.resource.capacity,
      exposureScenarios: [
        {
          id: "weapon-fire",
          label: "Weapon fire",
          payloadHits: 1,
          confidence: "sourced",
        },
      ],
      replenishment: profile.reload ? "reload" : "resupply",
      assumptions: [],
    },
  };
}

export function extractCombatSourceProfiles(
  item: Item,
): CombatSourceProfileResult {
  if (item.type === "Stratagem") return extractStratagemProfiles(item);
  const result = extractWeaponProfiles(item);
  return {
    profiles: result.profiles.map(carriedWeapon),
    unsupportedReasons: result.unsupportedReasons,
  };
}
