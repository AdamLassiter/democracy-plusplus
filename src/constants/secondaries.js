export const SECONDARIES = await fetch(`${import.meta.env.BASE_URL}/data/secondaries.json`).then(async response => await response.json());

export function getSecondary(displayName) {
  return SECONDARIES.find((item) => item.displayName === displayName);
}
