import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getMissionsRequiredForDifficulty } from '../constants/difficulties';
import { FACTIONS } from '../constants/factions';
import { getObjectives } from '../constants/objectives';
import { clampPlayerCount } from '../utils/playerCount';
import type { MissionStage, MissionState } from '../types';
import type { RootState } from './index';

const resetState = {
  faction: 0,
  objective: '',
  state: 'brief' as MissionStage,
};
const initialState: MissionState = {
  ...resetState,
  prng: Math.floor(Math.random() * 65536),
  playerCount: 1,
  count: 1,
  difficulty: 9,
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

function normaliseSeed(value: unknown, fallback: number) {
  const normalised = Math.trunc(normaliseNumber(value, fallback));
  return ((normalised % 65536) + 65536) % 65536;
}

function normaliseObjective(
  value: unknown,
  availableObjectives: ReturnType<typeof getObjectives>,
) {
  if (value === '') {
    return '';
  }

  if (typeof value === 'string' && availableObjectives.some((objective) => objective.displayName === value)) {
    return value;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return availableObjectives[value]?.displayName ?? availableObjectives[0]?.displayName ?? '';
  }

  return availableObjectives[0]?.displayName ?? '';
}

function normaliseMissionState(state: Partial<MissionState>): MissionState {
  const faction = Math.max(0, Math.min(normaliseNumber(state.faction, initialState.faction), FACTIONS.length - 1));
  const difficulty = Math.max(0, normaliseNumber(state.difficulty, initialState.difficulty));
  const availableObjectives = getObjectives(FACTIONS[faction] ?? FACTIONS[0], difficulty);
  const objective = normaliseObjective(state.objective, availableObjectives);
  const count = Math.max(1, normaliseNumber(state.count, initialState.count));
  const mission = Math.max(1, normaliseNumber(state.mission, initialState.mission));
  const prng = normaliseSeed(state.prng, initialState.prng);
  const playerCount = clampPlayerCount(state.playerCount ?? initialState.playerCount);

  return {
    ...initialState,
    ...state,
    faction,
    difficulty,
    objective,
    prng,
    playerCount,
    count,
    mission,
    factionLocked: Boolean(state.factionLocked),
  };
}

const selectRawMission = (state: RootState) => state.mission;

export const selectMission = createSelector(
  [selectRawMission],
  (mission) => normaliseMissionState(mission),
);

const missionSlice = createSlice({
  name: 'mission',
  initialState,
  reducers: {
    setPrng: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.prng = normaliseSeed(value, initialState.prng);
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
      state.objective = '';
    },
    setObjective: (state, action: PayloadAction<{ value: string }>) => {
      const { value } = action.payload;
      state.objective = value;
    },
    setDifficulty: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      if (state.factionLocked) {
        return;
      }
      state.difficulty = value;
      state.objective = '';
    },
    setPlayerCount: (state, action: PayloadAction<{ value: number }>) => {
      state.playerCount = clampPlayerCount(action.payload.value);
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
        objective: '',
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

export const { setPrng, setFaction, setObjective, setDifficulty, setPlayerCount, setCount, setState, setRestrictions, setQuests, setMissionState, resetMission } = missionSlice.actions;
export default missionSlice.reducer;
