import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const STRATAGEMS = await loadJson<Item[]>('/data/stratagems.json');

export function getStratagem(displayName: string) {
  return STRATAGEMS.find((item) => item.displayName === displayName);
}
