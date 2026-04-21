import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AchievementsState } from '../types';
import type { RootState } from './index';

const initialState: AchievementsState = {
  unlocked: [],
};

export function selectAchievements(state: RootState) {
  return state.achievements;
}

const achievementsSlice = createSlice({
  name: 'achievements',
  initialState,
  reducers: {
    unlockAchievements: (state, action: PayloadAction<{ value: string[] }>) => {
      const nextIds = action.payload.value.filter((id) => !state.unlocked.includes(id));
      state.unlocked.push(...nextIds);
    },
    setAchievementsState: (_state, action: PayloadAction<AchievementsState>) => action.payload,
    resetAchievements: () => initialState,
  },
});

export const { unlockAchievements, setAchievementsState, resetAchievements } = achievementsSlice.actions;
export default achievementsSlice.reducer;
