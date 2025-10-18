import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  prng: Math.floor(Math.random() * 65536),
  count: 15,
  faction: 0,
  objective: 0,
  state: 'brief',
  quests: [],
  restrictions: [],
};

const states = [
  'brief', 'generating', 'loadout', 'report',
];

export const selectMission = (state) => state.mission;

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
      state.state = value;
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
    resetMission: () => initialState,
  },
});

export const { setPrng, setFaction, setObjective, setCount, setState, setRestrictions, setQuests } = missionSlice.actions;
export default missionSlice.reducer;
