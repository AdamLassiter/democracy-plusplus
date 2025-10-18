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

function scaling(mission) {
  if (mission.count < 3) {
    return 'd';
  } else if (mission.count < 5) {
    return 'c';
  } else if (mission.count < 7) {
    return 'b';
  } else if (mission.count < 9) {
    return 'a';
  } else {
    return 's';
  }
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

function objectivesRequiredCount(mission) {
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

function objectivesCount(mission) {
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

function restrictions(mission, lastRestrictions=[]) {
  const numRestrictions = restrictionsCount(mission);
  // while numRestrictions
  // choose random (except objectiverequired, except lastRestrictions)
  // check no tag overlap
  // add restriction, decrement count
  const requiredObjectives = objectivesRequiredCount(mission);
  // add restriction according to mission scaling factor
}

function objectives(mission, lastObjectives=[]) {
  const numObjectives = objectivesCount(mission);
  // while numObjectives
  // choose random (except lastObjectives)
  // check no tag overlap
  // add objective according to mission scaling factor, decrement count
}

function missionReward(mission) {
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
