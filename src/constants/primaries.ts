import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const PRIMARIES = await loadJson<Item[]>('/data/primaries.json');

export function getPrimary(displayName: string) {
  return PRIMARIES.find((item) => item.displayName === displayName);
}
