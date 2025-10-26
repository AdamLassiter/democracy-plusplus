export const QUESTS = await fetch(`${import.meta.env.BASE_URL}/data/quests.json`).then(async response => await response.json());
