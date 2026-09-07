import { useMemo } from "react";
import { useSelector } from "react-redux";
import { getItem } from "../../constants";
import { STRUCTURES } from "../../constants/structures";
import { selectEquipment } from "../../slices/equipmentSlice";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { selectPlanner } from "../../slices/plannerSlice";
import type { AttackCapability, EquipmentState, Item, LobbyMember } from "../../types";
import { extractItemCapabilities } from "../../utils/capabilities";

type PlannerItem = { key: string; item: Item; playerName: string; capabilities: AttackCapability[] };

function equipmentEntries(equipment: EquipmentState) {
  return [
    ["primary", equipment.primary],
    ["secondary", equipment.secondary],
    ["throwable", equipment.throwable],
    ...equipment.stratagems.map((name, index) => [`stratagem-${index}`, name]),
    ["armor", equipment.armorPassive],
    ["booster", equipment.booster],
  ] as Array<[string, string | null]>;
}

function demolitionSource(item: Item) {
  const slug = item.wikiSlug?.replace(/#.*/, "").toLowerCase();
  return STRUCTURES.demolitionSources.find((source) => source.wikiSlug.replace(/#.*/, "").toLowerCase() === slug)
    ?? STRUCTURES.demolitionSources.find((source) => source.displayName.toLowerCase() === item.displayName.toLowerCase());
}

function memberItems(member: Pick<LobbyMember, "memberId" | "displayName" | "loadout">): PlannerItem[] {
  return equipmentEntries(member.loadout).flatMap(([slot, name]) => {
    const item = name ? getItem(name) : null;
    if (!item) return [];
    return [{
      key: `${member.memberId}:${slot}:${item.displayName}`,
      item,
      playerName: member.displayName,
      capabilities: extractItemCapabilities(item, demolitionSource(item)),
    }];
  });
}

export function usePlannerLoadout() {
  const localEquipment = useSelector(selectEquipment);
  const multiplayer = useSelector(selectMultiplayer);
  const planner = useSelector(selectPlanner);
  const localId = multiplayer.memberId ?? "local";
  const localName = multiplayer.lobbyState?.members.find((member) => member.memberId === localId)?.displayName
    ?? multiplayer.displayName
    ?? "This player";
  const localMember = useMemo(() => ({
    memberId: localId,
    displayName: localName,
    loadout: localEquipment,
  }), [localEquipment, localId, localName]);
  const members = useMemo(() => multiplayer.lobbyState?.members ?? [], [multiplayer.lobbyState?.members]);
  const entries = useMemo(() => {
    if (planner.scope === "squad" && members.length) {
      return members.flatMap((member) => member.memberId === localId ? memberItems(localMember) : memberItems(member));
    }
    if (planner.scope !== "local") {
      const selected = members.find((member) => member.memberId === planner.scope);
      if (selected) return memberItems(selected);
    }
    return memberItems(localMember);
  }, [localId, localMember, members, planner.scope]);
  const enabledEntries = entries.filter((entry) => !planner.disabledItemKeys.includes(entry.key));
  return {
    planner,
    entries,
    capabilities: enabledEntries.flatMap((entry) => entry.capabilities),
    members,
    localId,
  };
}
