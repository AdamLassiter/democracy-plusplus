import { RESTRICTIONS } from "../constants/restrictions";
import { QUESTS } from "../constants/quests";

function stars(mission) {
  return {
    1: 0.2,
    2: 0.4,
    3: 0.6,
    4: 0.8,
    5: 1.0,
  }[mission.stars];
}

function faction(mission) {
  return {
    "Terminids": 0,
    "Automatons": 1,
    "Illuminate": 2,
  }[mission.faction];
}

function tier(restriction) {
  return {
    's': 4,
    'a': 3,
    'b': 2,
    'c': 1,
    'd': 0,
  }[restriction.tier]
}

function reverseTier(scaling) {
  return ['d', 'c', 'b', 'a', 's'][scaling];
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

function missionTier(mission) {
  const missionFaction = faction(mission.faction);
  return {
    "Spread Democracy": ['s', 's', 'b'],
    "Conduct Geological Survey": ['a', 'a', null],
    "Retrieve Valuable Data": ['b', 'b', 'b'],
    "Emergency Evacuation": ['a', 'a', 'a'],
    "Blitz: Search and Destroy": ['c', 'c', 'c'],
    "Eradicate": ['d', 'd', 'd'],
    "Launch ICBM": ['a', 'a', 'a'],
    "Evacuate Civilians": ['s', 's', 's'],
    "Purge Hatcheries": ['c', null, null],
    "Enable Oil Extraction": ['a', null, null],
    "Nuke Nursery": ['b', null, null],
    "Sabotage Air Base": [null, 'a', null],
    "Destroy Command Bunkers": [null, 'a', null],
    "Neutralize Orbital Defenses": [null, 'a', null],
    "Take Down Overship": [null, null, 'a'],
    "Repel Invasion Fleet": [null, null, 's'],
  }[mission.objective][missionFaction];
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
    return [ { ...questRestriction, tier: reverseTier(count), displayName } ];
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
    const restrictionCandidate = randomChoice(pool.filter((candidate) => !restrictions.includes(candidate)), prng, 1)[0];
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
    const questCandidate = randomChoice(pool.filter((candidate) => !quests.some((quest) => quest.category === candidate.category)), prng, 1)[0];
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
  const pool = RESTRICTIONS.filter((restriction) => !lastRestrictions.includes(restriction) && tier(restriction) <= restrictionScaling);
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

export function missionReward(mission) {
  const missionTier = missionTier(mission);
  const stars = stars(mission);
  const tierCost = {
    's': 1.5,
    'a': 1.2,
    'b': 1.0,
    'c': 0.85,
    'd': 0.7,
  }[missionTier];

  return stars * tierCost;
}
