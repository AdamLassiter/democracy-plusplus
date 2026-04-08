import { loadJson } from "./loadJson";

export const FACTIONS = await loadJson<string[]>('/data/factions.json');
