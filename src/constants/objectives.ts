import { loadJson } from "./loadJson";
import type { Objective } from "../types";

export const OBJECTIVES = await loadJson<Objective[]>('/data/objectives.json');

export function getObjectiveNames(faction: string) {
  return getObjectives(faction)
    .map(objective => objective.displayName);
}

export function getObjectives(faction: string) {
  return OBJECTIVES
    .filter(objective => objective.tier[faction] !== null);
}
