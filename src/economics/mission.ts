import { RESTRICTIONS } from "../constants/restrictions";
import { QUESTS } from "../constants/quests";
import { getObjectives } from "../constants/objectives";
import { FACTIONS } from "../constants/factions";
import type { Faction, MissionState, Quest, Restriction, Tier } from "../types";

const BASE_REWARD = 100;

type MissionWithStars = MissionState & { stars: number };

function calculateStarsModifier(mission: MissionWithStars) {
  const modifiers: Record<0 | 1 | 2 | 3 | 4 | 5, number> = {
    0: 0.0,
    1: 0.4,
    2: 0.55,
    3: 0.7,
    4: 0.85,
    5: 1.0,
  };

  return modifiers[mission.stars as keyof typeof modifiers];
}

export function calculateFaction(mission: MissionState): Faction {
  const factions = [
    "Terminids",
    "Automatons",
    "Illuminate",
  ] as const;

  return factions[mission.faction] ?? factions[0];
}

function restrictionTier(restriction: Restriction) {
  const tiers: Record<Tier, number> = {
    s: 4,
    a: 3,
    b: 2,
    c: 1,
    d: 0,
  };

  return restriction.tier === null ? -1 : tiers[restriction.tier];
}

function descriptionOptions(item: Pick<Quest | Restriction, "description" | "descriptions">) {
  return item.descriptions?.length ? item.descriptions : [item.description];
}

function withRandomDescription<T extends Quest | Restriction>(
  item: T,
  prng: { rand(min: number, max?: number): number },
): T {
  const options = descriptionOptions(item);
  const description = options[prng.rand(options.length - 1)] ?? item.description;

  return {
    ...item,
    description,
  };
}

function getObjectiveModeTags(mission: MissionState) {
  const objective = getObjectives(FACTIONS[mission.faction])[mission.objective];
  const tags = objective.tags ?? [];

  return {
    eradicate: tags.includes("Eradicate"),
    blitz: tags.includes("Blitz"),
    commando: tags.includes("Commando"),
  };
}

function calculateMissionModifier(missionTier: Tier) {
  const modifiers: Record<Tier, number> = {
    s: 1.5,
    a: 1.2,
    b: 1.0,
    c: 0.85,
    d: 0.7,
  };

  return modifiers[missionTier];
}

function questsRequiredTier(count: number): Tier {
  const tiers: Record<number, Tier> = {
    0: "d",
    1: "c",
    2: "b",
    3: "a",
    4: "s",
  };

  return tiers[count] ?? "s";
}

function scaling(mission: MissionState) {
  if (mission.count < 3) {
    return 0;
  } else if (mission.count < 5) {
    return 1;
  } else if (mission.count < 7) {
    return 2;
  } else if (mission.count < 9) {
    return 3;
  } else {
    return 4;
  }
}

function randomChoice<T>(items: T[], prng: { rand(min: number, max?: number): number }, n = 1): T[] {
  const shuffled = items.sort(() => 0.5 - prng.rand(65536) / 65536);
  return shuffled.slice(0, n);
}

export function calculateMissionTier(mission: MissionState): Tier {
  const objective = getObjectives(FACTIONS[mission.faction])[mission.objective];
  const faction = calculateFaction(mission);
  return objective?.tier[faction] ?? "d";
}

function questsRequiredCount(mission: MissionState) {
  if (mission.count < 5) {
    return 0;
  } else if (mission.count < 9) {
    return 1;
  } else if (mission.count < 11) {
    return 2;
  } else {
    return 3;
  }
}

function questsRequired(mission: MissionState, prng: { rand(min: number, max?: number): number }): Restriction[] {
  const count = questsRequiredCount(mission);
  if (!count) {
    return [];
  }

  const questRestriction = RESTRICTIONS.find((restriction) => restriction.category === "questrequired");
  if (!questRestriction) {
    return [];
  }

  const displayName = questRestriction.displayName.replace("X", count.toString());
  return [withRandomDescription({ ...questRestriction, tier: questsRequiredTier(count), displayName }, prng)];
}

function restrictionsCount(mission: MissionState) {
  if (mission.count < 3) {
    return 0;
  } else if (mission.count < 7) {
    return 1;
  } else if (mission.count < 13) {
    return 2;
  } else {
    return 3;
  }
}

function questsCount(mission: MissionState) {
  if (mission.count < 5) {
    return 1;
  } else if (mission.count < 9) {
    return 2;
  } else if (mission.count < 11) {
    return 3;
  } else {
    return 4;
  }
}

function chooseRestrictions(
  pool: Restriction[],
  quests: Quest[],
  prng: { rand(min: number, max?: number): number },
  n: number,
): Restriction[] {
  const restrictions: Restriction[] = [];

  const comboRestrictions = pool.filter((candidate) =>
    (candidate.tags || []).every((tag) => quests.some((quest) => (quest.tags || []).includes(tag))),
  );
  if (n > 0 && comboRestrictions.length > 0 && prng.rand(100) > 50) {
    const comboRestriction = randomChoice(comboRestrictions, prng, 1)[0];
    if (comboRestriction) {
      restrictions.push(comboRestriction);
      n--;
    }
  }

  while (n > 0) {
    const dedupedPool = pool.filter((candidate) => !restrictions.includes(candidate));
    const restrictionCandidate = randomChoice(dedupedPool, prng, 1)[0];
    if (!restrictionCandidate) {
      break;
    }

    const allowed = !restrictionCandidate.tags;
    if (allowed) {
      restrictions.push(restrictionCandidate);
      n--;
    }
  }

  return restrictions;
}

function scaleQuest(quest: Quest, prng: { rand(min: number, max?: number): number }, questScaling: number): Quest {
  const values = quest.values ?? [];
  let min: number;
  let max: number;

  if (questScaling === 0) {
    min = values[0];
    max = (values[0] + values[1]) / 2;
  } else if (questScaling === 4) {
    min = (values[3] + values[4]) / 2;
    max = values[4];
  } else {
    min = (values[questScaling - 1] + values[questScaling]) / 2;
    max = (values[questScaling] + values[questScaling + 1]) / 2;
  }

  const reward = quest.rewards?.[questScaling] ?? 0;
  const rand = prng.rand(65536) / 65536;
  let value = min * rand + max * (1 - rand);
  value = quest.datatype === "float" ? Math.round(value * 10) / 10 : Math.round(value);

  return {
    ...quest,
    description: withRandomDescription(quest, prng).description,
    reward,
    value,
    displayName: quest.displayName.replace("X", value.toString()),
  };
}

function chooseQuests(
  pool: Quest[],
  prng: { rand(min: number, max?: number): number },
  n: number,
  questScaling: number,
): Quest[] {
  const quests: Quest[] = [];

  while (n > 0) {
    const dedupedPool = pool.filter((candidate) => !quests.some((quest) => quest.category === candidate.category));
    const questCandidate = randomChoice(dedupedPool, prng, 1)[0];
    if (!questCandidate) {
      break;
    }

    const allowed = quests.every((quest) =>
      (quest.tags || []).every((tag) => !(questCandidate.tags || []).includes(tag)),
    );
    if (allowed) {
      quests.push(questCandidate);
      n--;
    }
  }

  return quests.map((quest) => scaleQuest(quest, prng, questScaling));
}

export function calculateRestrictions(
  mission: MissionState,
  quests: Quest[],
  prng: { rand(min: number, max?: number): number },
  lastRestrictions: Restriction[] = [],
) {
  const numRestrictions = restrictionsCount(mission);
  const restrictionScaling = scaling(mission);
  const pool = RESTRICTIONS.filter(
    (restriction) => !lastRestrictions.includes(restriction)
      && restrictionTier(restriction) <= restrictionScaling
      && restriction.category !== "questrequired",
  );
  const chosen = chooseRestrictions(pool, quests, prng, numRestrictions).map((restriction) =>
    withRandomDescription(restriction, prng),
  );
  const requiredQuests = questsRequired(mission, prng);
  return [requiredQuests, chosen].flat();
}

function questValuesForMission(mission: MissionState, quest: Quest) {
  const modeTags = getObjectiveModeTags(mission);
  const questTags = quest.tags ?? [];
  const isStratagemExclusive = questTags.includes("exclusivestratagem")
    || questTags.includes("exclusivestratagems")
    || questTags.includes("exclisivestratagem")
    || questTags.includes("exclisivestratagems");

  if (modeTags.commando && isStratagemExclusive) {
    return undefined;
  }

  const objective = getObjectives(FACTIONS[mission.faction])[mission.objective];
  const isShortMission = objective.missionLength === "short"
    || (objective.missionLength === undefined && (modeTags.eradicate || modeTags.blitz || modeTags.commando));

  if (!isShortMission) {
    return quest.values;
  }

  if (modeTags.eradicate) {
    return quest.eradicateValues ?? quest.values;
  }
  if (modeTags.blitz) {
    return quest.blitzValues ?? quest.values;
  }
  if (modeTags.commando) {
    return quest.commandoValues ?? quest.values;
  }

  return quest.values;
}

function shortObjectiveImpliesShortQuest(mission: MissionState, quest: Quest): Quest | undefined {
  const values = questValuesForMission(mission, quest);
  return values ? { ...quest, values } : undefined;
}

export function calculateQuests(
  mission: MissionState,
  prng: { rand(min: number, max?: number): number },
  lastQuests: Quest[] = [],
) {
  const numQuests = questsCount(mission);
  const questScaling = scaling(mission);
  const pool = QUESTS
    .map((quest) => !lastQuests.includes(quest) && shortObjectiveImpliesShortQuest(mission, quest))
    .filter((quest): quest is Quest => Boolean(quest));

  return chooseQuests(pool, prng, numQuests, questScaling);
}

export function calculateMissionReward(mission: MissionWithStars) {
  const stars = calculateStarsModifier(mission);
  const missionTier = calculateMissionTier(mission);
  const missionModifier = calculateMissionModifier(missionTier);

  return Math.round(BASE_REWARD * stars * missionModifier);
}

export function calculateQuestsReward(quests: Quest[]) {
  return quests
    .filter((quest) => quest.completed)
    .map((quest) => quest.reward ?? 0)
    .reduce((a, b) => a + b, 0);
}

export function calculateRestrictionsReward(restrictions: Restriction[], missionReward: number, questsReward: number) {
  return restrictions.every((restriction) => restriction.completed) ? 0 : 0 - missionReward - questsReward;
}
