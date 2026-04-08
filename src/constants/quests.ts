import { loadJson } from "./loadJson";
import type { Item } from "../types";

export const QUESTS = await loadJson<Item[]>('/data/quests.json');
