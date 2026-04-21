import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const ARMOR_PASSIVES = await loadJson<Item[]>('/data/armor_passives.json');

export function getArmorPassive(displayName: string) {
  return ARMOR_PASSIVES.find((item) => item.displayName === displayName);
}
