import { loadJson } from "./loadJson";
import type { Difficulty } from "../types";

export const DIFFICULTIES = await loadJson<Difficulty[]>('/data/difficulties.json');

export function getMissionsRequiredForDifficulty(difficulty: number) {
  const selectedDifficulty = DIFFICULTIES[difficulty] ?? DIFFICULTIES[0];
  return selectedDifficulty.missions ?? 1;
}
