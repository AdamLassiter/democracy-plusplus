import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LogState, MissionLogEntry, PurchaseLogEntry } from '../types';
import type { RootState } from './index';

const initialState: LogState = {
  entries: [],
};

export function selectLog(state: RootState) {
  return state.log;
}

const logSlice = createSlice({
  name: 'log',
  initialState,
  reducers: {
    addPurchaseLogEntry: (state, action: PayloadAction<PurchaseLogEntry>) => {
      state.entries.unshift(action.payload);
    },
    addMissionLogEntry: (state, action: PayloadAction<MissionLogEntry>) => {
      state.entries.unshift(action.payload);
    },
    setLogState: (_state, action: PayloadAction<LogState>) => action.payload,
    clearLog: () => initialState,
  },
});

export const { addPurchaseLogEntry, addMissionLogEntry, setLogState, clearLog } = logSlice.actions;
export default logSlice.reducer;
