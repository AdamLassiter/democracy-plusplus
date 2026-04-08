import { loadJson } from "./loadJson";
import type { Warbond } from "../types";

export const WARBONDS = await loadJson<Warbond[]>('/data/warbonds.json');

export function getWarbond(displayName: string) {
  return WARBONDS.find((item) => item.displayName === displayName);
}
export function getWarbondByCode(warbondCode: string) {
  return WARBONDS.find((item) => item.warbondCode === warbondCode);
}
