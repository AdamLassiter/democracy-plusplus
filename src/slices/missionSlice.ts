import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
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
  quests: [],
  restrictions: [],
};

const states: MissionStage[] = [
  'brief', 'generating', 'loadout', 'debrief',
];

export function selectMission(state: RootState) {
  return state.mission;
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
      }
    },
    setFaction: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.faction = value;
    },
    setObjective: (state, action: PayloadAction<{ value: number }>) => {
      const { value } = action.payload;
      state.objective = value;
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
      return action.payload;
    },
    resetMission: (state) => ({ ...state, ...resetState, count: state.count + 1 }),
  },
});

export const { setPrng, setFaction, setObjective, setCount, setState, setRestrictions, setQuests, setMissionState, resetMission } = missionSlice.actions;
export default missionSlice.reducer;
