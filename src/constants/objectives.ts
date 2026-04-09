import { loadJson } from "./loadJson";
import type { Faction, Objective } from "../types";

export const OBJECTIVES = await loadJson<Objective[]>('/data/objectives.json');

export function getObjectiveNames(faction: Faction) {
  return getObjectives(faction)
    .map(objective => objective.displayName);
}

export function getObjectives(faction: Faction) {
  return OBJECTIVES
    .filter(objective => objective.tier[faction] !== null);
}
