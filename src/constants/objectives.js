export const OBJECTIVES = await fetch(`${import.meta.env.BASE_URL}/data/objectives.json`).then(async response => await response.json());

export function getObjectiveNames(faction) {
  return getObjectives(faction)
    .map(objective => objective.displayName);
}

export function getObjectives(faction) {
  return OBJECTIVES
    .filter(objective => objective.tier[faction] !== null);
}
