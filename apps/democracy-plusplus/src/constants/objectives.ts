import { loadJson } from "./loadJson";
import type { Faction, Objective } from "../types";

export const OBJECTIVES = await loadJson<Objective[]>('/data/objectives.json');

export function getObjectiveNames(faction: Faction) {
  return getObjectives(faction)
    .map(objective => objective.displayName);
}

export function getObjective(faction: Faction, displayName: string, difficulty?: number) {
  return getObjectives(faction, difficulty)
    .find((objective) => objective.displayName === displayName);
}

export function getObjectives(faction: Faction, difficulty?: number) {
  const difficultyLevel = difficulty === undefined ? undefined : difficulty + 1;

  return OBJECTIVES
    .filter((objective) => {
      if (objective.tier[faction] === null) {
        return false;
      }

      if (difficultyLevel === undefined) {
        return true;
      }

      const minDifficulty = objective.minDifficulty ?? 1;
      const maxDifficulty = objective.maxDifficulty ?? Number.MAX_SAFE_INTEGER;
      return minDifficulty <= difficultyLevel && difficultyLevel <= maxDifficulty;
    });
}
