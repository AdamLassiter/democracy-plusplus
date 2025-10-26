export const STRATAGEMS = await fetch(`${import.meta.env.BASE_URL}/data/stratagems.json`).then(async response => await response.json());

export function getStratagem(displayName) {
  return STRATAGEMS.find((item) => item.displayName === displayName);
}
