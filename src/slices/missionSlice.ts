import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getMissionsRequiredForDifficulty } from '../constants/difficulties';
import { FACTIONS } from '../constants/factions';
import { getObjectives } from '../constants/objectives';
import type { MissionStage, MissionState } from '../types';
import type { RootState } from './index';

const resetState = {
  faction: 0,
  objective: 0,
  state: 'brief' as MissionStage,
};
const initialState: MissionState = {
  ...resetState,
  prng: Math.floor(Math.random() * 65536),
  count: 1,
  difficulty: 0,
  mission: 1,
  factionLocked: false,
  quests: [],
  restrictions: [],
};

const states: MissionStage[] = [
  'brief', 'generating', 'loadout', 'debrief',
];

function normaliseNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normaliseMissionState(state: Partial<MissionState>): MissionState {
  const faction = Math.max(0, Math.min(normaliseNumber(state.faction, initialState.faction), FACTIONS.length - 1));
  const difficulty = Math.max(0, normaliseNumber(state.difficulty, initialState.difficulty));
  const availableObjectives = getObjectives(FACTIONS[faction] ?? FACTIONS[0], difficulty);
  const objective = Math.max(
    0,
    Math.min(normaliseNumber(state.objective, initialState.objective), Math.max(availableObjectives.length - 1, 0)),
  );
  const count = Math.max(1, normaliseNumber(state.count, initialState.count));
  const mission = Math.max(1, normaliseNumber(state.mission, initialState.mission));

  return {
    ...initialState,
    ...state,
    faction,
    difficulty,
    objective,
    count,
    mission,
    factionLocked: Boolean(state.factionLocked),
  };
}

export function selectMission(state: RootState) {
  return normaliseMissionState(state.mission);
}

const missionSlice = createSlice({
  name: 'mission',
  initialState,
  reducers: {
    setPrng: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.prng = value;
    },
    setState: (state, action: PayloadAction<{ value: MissionStage }>) => {
      const { value } = action.payload;
      if (states.includes(value)) {
        state.state = value;
        if (value === 'generating') {
          state.factionLocked = true;
        }
      }
    },
    setFaction: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      if (state.factionLocked) {
        return;
      }
      state.faction = value;
    },
    setObjective: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.objective = value;
    },
    setDifficulty: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      if (state.factionLocked) {
        return;
      }
      state.difficulty = value;
      state.objective = 0;
    },
    setCount: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.count = value;
    },
    setQuests: (state, action: PayloadAction<{ value: MissionState['quests'] }>) => {
      const { value } = action.payload;
      state.quests = value;
    },
    setRestrictions: (state, action: PayloadAction<{ value: MissionState['restrictions'] }>) => {
      const { value } = action.payload;
      state.restrictions = value;
    },
    setMissionState: (_state, action: PayloadAction<MissionState>) => {
      return normaliseMissionState(action.payload);
    },
    resetMission: (state) => {
      const missionsRequired = getMissionsRequiredForDifficulty(state.difficulty);
      const unlockFaction = state.mission >= missionsRequired;

      return normaliseMissionState({
        ...state,
        objective: 0,
        state: 'brief' as MissionStage,
        count: state.count + 1,
        mission: unlockFaction ? 1 : state.mission + 1,
        factionLocked: !unlockFaction,
        quests: [],
        restrictions: [],
      });
    },
  },
});

export const { setPrng, setFaction, setObjective, setDifficulty, setCount, setState, setRestrictions, setQuests, setMissionState, resetMission } = missionSlice.actions;
export default missionSlice.reducer;
