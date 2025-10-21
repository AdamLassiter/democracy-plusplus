import { RESTRICTIONS } from "../constants/restrictions";
import { QUESTS } from "../constants/quests";
import { getObjectives } from "../constants/objectives";

const BASE_REWARD = 100;

function calculateStarsModifier(mission) {
  return {
    0: 0.0,
    1: 0.4,
    2: 0.55,
    3: 0.7,
    4: 0.85,
    5: 1.0,
  }[mission.stars];
}

export function calculateFaction(mission) {
  return [
    "Terminids",
    "Automatons",
    "Illuminate",
  ][mission.faction];
}

function restrictionTier(restriction) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[restriction.tier]
}

function calculateMissionModifier(missionTier) {
  return {
    's': 1.5,
    'a': 1.2,
    'b': 1.0,
    'c': 0.85,
    'd': 0.7,
  }[missionTier];
}

function questsRequiredTier(scaling) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[scaling];
}

function scaling(mission) {
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

function randomChoice(items, prng, n = 1) {
  const shuffled = items.sort(() => 0.5 - prng.rand(65536) / 65536);
  const selected = shuffled.slice(0, n);
  return selected;
}

export function calculateMissionTier(mission) {
  return getObjectives(mission.faction)[mission.objective].tier[calculateFaction(mission)];
}

function questsRequiredCount(mission) {
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

function questsRequired(mission) {
  const count = questsRequiredCount(mission);
  if (count) {
    const questRestriction = RESTRICTIONS.find((restriction) => restriction.category === 'questrequired');
    const displayName = questRestriction.displayName.replace('X', count);
    return [ { ...questRestriction, tier: questsRequiredTier(count), displayName } ];
  } else {
    return [];
  }
}

function restrictionsCount(mission) {
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

function questsCount(mission) {
  if (mission.count < 5) {
    return 1;
  } else if (mission.count < 7) {
    return 2;
  } else if (mission.count < 11) {
    return 3;
  } else {
    return 4;
  }
}

function chooseRestrictions(pool, quests, prng, n) {
  const restrictions = [];

  const comboRestrictions = pool.filter((candidate) => (candidate.tags || []).every((tag) => quests.some((quest) => (quest.tags || []).includes(tag))));
  if (n > 0 && comboRestrictions && prng.rand(100) > 50) {
    const comboRestriction = randomChoice(comboRestrictions, prng, 1)[0];
    restrictions.push(comboRestriction);
    n --;
  }

  while (n > 0) {
    const dedupedPool = pool.filter((candidate) => !restrictions.includes(candidate));
    const restrictionCandidate = randomChoice(dedupedPool, prng, 1)[0];
    const allowed = !restrictionCandidate.tags;
    if (allowed) {
      restrictions.push(restrictionCandidate);
      n --;
    }
  }
  return restrictions;
}

function scaleQuest(quest, prng, scaling) {
  let min, max;
  if (scaling === 0) {
    min = quest.values[0];
    max = (quest.values[0] + quest.values[1]) / 2;
  } else if (scaling === 4) {
    min = (quest.values[3] + quest.values[4]) / 2;
    max = quest.values[4];
  } else {
    min = (quest.values[scaling - 1] + quest.values[scaling]) / 2;
    max = (quest.values[scaling] + quest.values[scaling + 1]) / 2;
  }

  const reward = quest.rewards[scaling];

  const rand = prng.rand(65536) / 65536;
  let value = min * rand + max * (1 - rand);
  if (quest.datatype === 'float') {
    value = Math.round(value * 10) / 10;
  } else {
    value = Math.round(value);
  }

  const displayName = quest.displayName.replace("X", value);

  return { ...quest, reward, value, displayName };
}

function chooseQuests(pool, prng, n, scaling) {
  const quests = [];
  while (n > 0) {
    const dedupedPool = pool.filter((candidate) => !quests.some((quest) => quest.category === candidate.category));
    const questCandidate = randomChoice(dedupedPool, prng, 1)[0];
    const allowed = quests.every((quest) => (quest.tags || []).every((tag) => !(questCandidate.tags || []).includes(tag)))
    if (allowed) {
      quests.push(questCandidate);
      n --;
    }
  }
  return quests.map((quest) => scaleQuest(quest, prng, scaling));
}

export function calculateRestrictions(mission, quests, prng, lastRestrictions=[]) {
  const numRestrictions = restrictionsCount(mission);
  const restrictionScaling = scaling(mission);
  const pool = RESTRICTIONS.filter((restriction) => !lastRestrictions.includes(restriction) && restrictionTier(restriction) <= restrictionScaling);
  const chosen = chooseRestrictions(pool, quests, prng, numRestrictions);
  const requiredQuests = questsRequired(mission);
  return [requiredQuests, chosen].flat();
}

export function calculateQuests(mission, prng, lastQuests=[]) {
  const numQuests = questsCount(mission);
  const questScaling = scaling(mission);
  const pool = QUESTS.filter((quest) => !lastQuests.includes(quest));
  return chooseQuests(pool, prng, numQuests, questScaling);
}

export function calculateMissionReward(mission) {
  const stars = calculateStarsModifier(mission);

  const missionTier = calculateMissionTier(mission);
  const missionModifier = calculateMissionModifier(missionTier);

  return Math.round(BASE_REWARD * stars * missionModifier);
}

export function calculateQuestsReward(quests) {
  return quests.filter((quest) => quest.completed)
    .map((quest) => quest.reward)
    .reduce((a, b) => a + b, 0);
}

export function calculateRestrictionsReward(restrictions, missionReward, questsReward) {
  return restrictions.every((restriction) => restriction.completed)
    ? 0
    : 0 - missionReward - questsReward;
}
