import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  credits: 100,
};

export const selectCredits = (state) => state.credits;

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
    resetCredits: () => initialState,
  },
});

export const { addCredits, subtractCredits, resetCredits } = creditsSlice.actions;
export default creditsSlice.reducer;
