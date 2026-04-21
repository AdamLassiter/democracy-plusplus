import { createSlice } from '@reduxjs/toolkit';
import type { CreditsState } from '../types';
import type { RootState } from './index';

const initialState: CreditsState = {
  credits: 200,
};

export function selectCredits(state: RootState) {
  return state.credits;
}

const creditsSlice = createSlice({
  name: 'credits',
  initialState,
  reducers: {
    addCredits: (state, action) => {
      const { amount } = action.payload;
      state.credits += amount;
    },
    subtractCredits: (state, action) => {
      const { amount } = action.payload;
      state.credits = Math.max(0, state.credits - amount);
    },
    setCreditsState: (_state, action) => {
      return action.payload;
    },
    resetCredits: () => initialState,
  },
});

export const { addCredits, subtractCredits, setCreditsState, resetCredits } = creditsSlice.actions;
export default creditsSlice.reducer;
