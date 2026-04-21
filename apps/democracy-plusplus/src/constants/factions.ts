import { loadJson } from "./loadJson";
import type { Faction } from "../types";

export const FACTIONS = await loadJson<Faction[]>('/data/factions.json');
