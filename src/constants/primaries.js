export const PRIMARIES = await fetch(`${import.meta.env.BASE_URL}/data/primaries.json`).then(async response => await response.json());

export function getPrimary(displayName) {
  return PRIMARIES.find((item) => item.displayName === displayName);
}
