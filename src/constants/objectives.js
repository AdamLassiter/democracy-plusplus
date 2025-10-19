export function getObjectiveNames(faction) {
  return getObjectives(faction)
    .map(objective => objective.displayName);
}

export function getObjectives(faction) {
  return OBJECTIVES
    .filter(objective => objective.tier[faction] !== null);
}

const OBJECTIVES = [
  {
    displayName: "Spread Democracy",
    tier: {
      Terminids: 's',
      Automatons: 's',
      Illuminate: 'b',
    },
  },
  {
    displayName: "Conduct Geological Survey",
    tier: {
      Terminids: 'a',
      Automatons: 'a',
      Illuminate: null,
    },
  },
  {
    displayName: "Retrieve Valuable Data",
    tier: {
      Terminids: 'b',
      Automatons: 'b',
      Illuminate: 'b',
    },
  },
  {
    displayName: "Emergency Evacuation",
    tier: {
      Terminids: 'a',
      Automatons: 'a',
      Illuminate: 'a',
    },
  },
  {
    displayName: "Blitz: Search and Destroy",
    tier: {
      Terminids: 'c',
      Automatons: 'c',
      Illuminate: 'c',
    },
  },
  {
    displayName: "Eradicate",
    tier: {
      Terminids: 'd',
      Automatons: 'd',
      Illuminate: 'd',
    },
  },
  {
    displayName: "Launch ICBM",
    tier: {
      Terminids: 'a',
      Automatons: 'a',
      Illuminate: 'a',
    },
  },
  {
    displayName: "Evacuate Civilians",
    tier: {
      Terminids: 's',
      Automatons: 's',
      Illuminate: 's',
    },
  },
  {
    displayName: "Purge Hatcheries",
    tier: {
      Terminids: 'c',
      Automatons: null,
      Illuminate: null,
    },
  },
  {
    displayName: "Enable Oil Extraction",
    tier: {
      Terminids: 'a',
      Automatons: null,
      Illuminate: null,
    },
  },
  {
    displayName: "Nuke Nursery",
    tier: {
      Terminids: 'b',
      Automatons: null,
      Illuminate: null,
    },
  },
  {
    displayName: "Sabotage Air Base",
    tier: {
      Terminids: null,
      Automatons: 'a',
      Illuminate: null,
    },
  },
  {
    displayName: "Destroy Command Bunkers",
    tier: {
      Terminids: null,
      Automatons: 'a',
      Illuminate: null,
    },
  },
  {
    displayName: "Neutralize Orbital Defenses",
    tier: {
      Terminids: null,
      Automatons: 'a',
      Illuminate: null,
    },
  },
  {
    displayName: "Take Down Overship",
    tier: {
      Terminids: null,
      Automatons: null,
      Illuminate: 'a',
    },
  },
  {
    displayName: "Repel Invasion Fleet",
    tier: {
      Terminids: null,
      Automatons: null,
      Illuminate: 's',
    },
  },
];
