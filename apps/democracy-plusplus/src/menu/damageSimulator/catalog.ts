import { PRIMARIES } from "../../constants/primaries";
import { SECONDARIES } from "../../constants/secondaries";
import { STRATAGEMS } from "../../constants/stratagems";
import {
  combatSourceGroupOrder,
  type CombatSourceOption,
} from "../../utils/damage/combatSourceCatalog";
import { extractCombatSourceProfiles } from "../../utils/damage/combatProfiles";

export const COMBAT_SOURCES: CombatSourceOption[] = [...PRIMARIES, ...SECONDARIES, ...STRATAGEMS]
  .map((item) => ({ item, result: extractCombatSourceProfiles(item) }))
  .sort((left, right) => {
    const groupDifference = combatSourceGroupOrder(left) - combatSourceGroupOrder(right);
    return groupDifference || left.item.displayName.localeCompare(right.item.displayName);
  });
