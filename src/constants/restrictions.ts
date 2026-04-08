import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const RESTRICTIONS = await loadJson<Item[]>('/data/restrictions.json');
