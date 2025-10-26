export const BOOSTERS = await fetch(`${import.meta.env.BASE_URL}/data/boosters.json`).then(async response => await response.json());

export function getBooster(displayName) {
  return BOOSTERS.find((item) => item.displayName === displayName);
}
