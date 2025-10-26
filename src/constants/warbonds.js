export const WARBONDS = await fetch(`${import.meta.env.BASE_URL}/data/warbonds.json`).then(async response => await response.json());

export function getWarbond(displayName) {
  return WARBONDS.find((item) => item.displayName === displayName);
}
export function getWarbondByCode(warbondCode) {
  return WARBONDS.find((item) => item.warbondCode === warbondCode);
}
