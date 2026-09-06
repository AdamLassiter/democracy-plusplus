import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PreferencesState } from '../types';
import type { RootState } from './index';

const initialState: PreferencesState = {
  titles: true,
  tooltips: true,
  missionFlowBanner: true,
  detailedAntiTank: false,
};

export function selectPreferences(state: RootState) {
  return state.preferences;
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setTitles: (state, action) => {
      const titles = action.payload;
      state.titles = titles;
    },
    setTooltips: (state, action) => {
      const tooltips = action.payload;
      state.tooltips = tooltips;
    },
    setMissionFlowBanner: (state, action) => {
      const missionFlowBanner = action.payload;
      state.missionFlowBanner = missionFlowBanner;
    },
    setDetailedAntiTank: (state, action: PayloadAction<boolean>) => {
      state.detailedAntiTank = action.payload;
    },
    setPreferencesState: (_state, action: PayloadAction<Partial<PreferencesState>>) => {
      return { ...initialState, ...action.payload };
    },
    resetPreferences: () => initialState,
  },
});

export const {
  setTitles,
  setTooltips,
  setMissionFlowBanner,
  setDetailedAntiTank,
  setPreferencesState,
  resetPreferences,
} = preferencesSlice.actions;
export default preferencesSlice.reducer;
