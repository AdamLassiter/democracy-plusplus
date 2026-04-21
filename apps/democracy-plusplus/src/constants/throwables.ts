import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const THROWABLES = await loadJson<Item[]>('/data/throwables.json');

export function getThrowable(displayName: string) {
  return THROWABLES.find((item) => item.displayName === displayName);
}
