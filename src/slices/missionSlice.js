import { createSlice } from '@reduxjs/toolkit';

const resetState = {
  faction: 0,
  objective: 0,
  state: 'brief',
}
const initialState = {
  ...resetState,
  prng: Math.floor(Math.random() * 65536),
  count: 1,
  quests: [],
  restrictions: [],
};

const states = [
  'brief', 'generating', 'loadout', 'debrief',
];

export function selectMission(state) {
  return state.mission;
}

const missionSlice = createSlice({
  name: 'mission',
  initialState,
  reducers: {
    setPrng: (state, action) => {
      const { value } = action.payload;
      state.prng = value;
    },
    setState: (state, action) => {
      const { value } = action.payload;
      if (states.includes(value)) {
        state.state = value;
      }
    },
    setFaction: (state, action) => {
      const { value } = action.payload;
      state.faction = value;
    },
    setObjective: (state, action) => {
      const { value } = action.payload;
      state.objective = value;
    },
    setCount: (state, action) => {
      const { value } = action.payload;
      state.count = value;
    },
    setQuests: (state, action) => {
      const { value } = action.payload;
      state.quests = value;
    },
    setRestrictions: (state, action) => {
      const { value } = action.payload;
      state.restrictions = value;
    },
    setMissionState: (state, action) => {
      return action.payload;
    },
    resetMission: (state) => ({ ...state, ...resetState, count: state.count + 1 }),
  },
});

export const { setPrng, setFaction, setObjective, setCount, setState, setRestrictions, setQuests, setMissionState, resetMission } = missionSlice.actions;
export default missionSlice.reducer;
