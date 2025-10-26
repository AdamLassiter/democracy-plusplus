export const ARMOR_PASSIVES = await fetch(`${import.meta.env.BASE_URL}/data/armor_passives.json`).then(async response => await response.json());

export function getArmorPassive(displayName) {
  return ARMOR_PASSIVES.find((item) => item.displayName === displayName);
}
