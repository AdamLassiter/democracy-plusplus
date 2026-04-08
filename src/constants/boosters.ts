import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const BOOSTERS = await loadJson<Item[]>('/data/boosters.json');

export function getBooster(displayName: string) {
  return BOOSTERS.find((item) => item.displayName === displayName);
}
