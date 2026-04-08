import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const SECONDARIES = await loadJson<Item[]>('/data/secondaries.json');

export function getSecondary(displayName: string) {
  return SECONDARIES.find((item) => item.displayName === displayName);
}
