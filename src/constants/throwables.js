export const THROWABLES = await fetch(`${import.meta.env.BASE_URL}/data/throwables.json`).then(async response => await response.json());

export function getThrowable(displayName) {
  return THROWABLES.find((item) => item.displayName === displayName);
}
