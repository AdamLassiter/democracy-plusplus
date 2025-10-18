export function getObjectives(faction) {
  if (faction === 'Terminids') {
    return [...OBJECTIVES, ...TERMINID_OBJECTIVES];
  } else if (faction === 'Automatons') {
    return [...OBJECTIVES, ...AUTOMATON_OBJECTIVES];
  } else if (faction === 'Illuminate') {
    return [...OBJECTIVES, ...ILLUMINATE_OBJECTIVES];
  } else {
    return [...OBJECTIVES, ...TERMINID_OBJECTIVES, ...AUTOMATON_OBJECTIVES, ...ILLUMINATE_OBJECTIVES];
  }
}

export const OBJECTIVES = [
  "Spread Democracy",
  "Conduct Geological Survey",
  "Retrieve Valuable Data",
  "Emergency Evacuation",
  "Blitz",
  "Eradicate",
  "Launch ICBM",
  "Evacuate Civilians",
];

const TERMINID_OBJECTIVES = [
  "Purge Hatcheries",
  "Enable Oil Extraction",
  "Nuke Nursery",
];

const AUTOMATON_OBJECTIVES = [
  "Sabotage Air Base",
  "Destroy Command Bunkers",
  "Neutralize Orbital Defenses",
];

const ILLUMINATE_OBJECTIVES = [
  "Take Down Overship",
  "Repel Invasion Fleet",
];
