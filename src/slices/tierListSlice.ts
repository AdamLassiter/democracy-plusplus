import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { TierListState } from "../types";

const initialState: TierListState = {
  customized: false,
  overrides: {},
};

export function selectTierList(state: RootState) {
  return state.tierList;
}

const tierListSlice = createSlice({
  name: "tierList",
  initialState,
  reducers: {
    setTierList: (_state, action: PayloadAction<TierListState>) => action.payload,
    resetTierList: () => initialState,
  },
});

export const { setTierList, resetTierList } = tierListSlice.actions;
export default tierListSlice.reducer;
