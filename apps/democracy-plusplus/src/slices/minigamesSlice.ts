import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MinigamesState } from '../types';
import type { RootState } from './index';

const initialState: MinigamesState = {
  stratagemDrillBestScore: 0,
  bureaucraticFormsBestScore: 0,
};

export function selectMinigames(state: RootState) {
  return state.minigames;
}

const minigamesSlice = createSlice({
  name: 'minigames',
  initialState,
  reducers: {
    recordStratagemDrillScore: (state, action: PayloadAction<{ value: number }>) => {
      state.stratagemDrillBestScore = Math.max(state.stratagemDrillBestScore, action.payload.value);
    },
    recordBureaucraticFormsScore: (state, action: PayloadAction<{ value: number }>) => {
      state.bureaucraticFormsBestScore = Math.max(state.bureaucraticFormsBestScore, action.payload.value);
    },
    setMinigamesState: (_state, action: PayloadAction<MinigamesState>) => action.payload,
    resetMinigames: () => initialState,
  },
});

export const {
  recordStratagemDrillScore,
  recordBureaucraticFormsScore,
  setMinigamesState,
  resetMinigames,
} = minigamesSlice.actions;
export default minigamesSlice.reducer;
