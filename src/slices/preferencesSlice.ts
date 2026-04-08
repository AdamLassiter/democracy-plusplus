import { createSlice } from '@reduxjs/toolkit';
import type { PreferencesState } from '../types';
import type { RootState } from './index';

const initialState: PreferencesState = {
  titles: true,
  tooltips: true,
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
    setPreferencesState: (_state, action) => {
      return action.payload;
    },
    resetPreferences: () => initialState,
  },
});

export const { setTitles, setTooltips, setPreferencesState, resetPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;
