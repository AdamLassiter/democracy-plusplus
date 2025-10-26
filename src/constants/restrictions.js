export const RESTRICTIONS = await fetch(`${import.meta.env.BASE_URL}/data/restrictions.json`).then(async response => await response.json());
