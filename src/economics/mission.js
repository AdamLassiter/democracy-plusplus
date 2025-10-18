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
