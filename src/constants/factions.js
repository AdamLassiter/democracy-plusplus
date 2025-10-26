export const FACTIONS = await fetch(`${import.meta.env.BASE_URL}/data/factions.json`).then(async response => await response.json());
