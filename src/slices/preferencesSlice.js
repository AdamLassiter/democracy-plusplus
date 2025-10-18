import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  titles: true,
  tooltips: true,
};

export const selectPreferences = (state) => state.preferences;

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
    resetPreferences: () => initialState,
  },
});

export const { setTitles, setTooltips } = preferencesSlice.actions;
export default preferencesSlice.reducer;
