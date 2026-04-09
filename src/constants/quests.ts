import { loadJson } from "./loadJson";
import type { Quest } from "../types";

export const QUESTS = await loadJson<Quest[]>('/data/quests.json');
