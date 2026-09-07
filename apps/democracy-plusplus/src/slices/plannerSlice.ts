import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CoverageState, EnemyCoverageState, PlannerState } from "../types";
import type { RootState } from "./index";

const initialState: PlannerState = {
  mode: "browse",
  scope: "local",
  disabledItemKeys: [],
  enemyCoverageFilters: ["none", "partialResisted", "partial"],
  structureCoverageFilters: ["none"],
};

const plannerSlice = createSlice({
  name: "planner",
  initialState,
  reducers: {
    setPlannerMode(state, action: PayloadAction<PlannerState["mode"]>) {
      state.mode = action.payload;
    },
    setPlannerScope(state, action: PayloadAction<string>) {
      state.scope = action.payload;
      state.disabledItemKeys = [];
    },
    togglePlannerItem(state, action: PayloadAction<string>) {
      const key = action.payload;
      state.disabledItemKeys = state.disabledItemKeys.includes(key)
        ? state.disabledItemKeys.filter((value) => value !== key)
        : [...state.disabledItemKeys, key];
    },
    retainPlannerItems(state, action: PayloadAction<string[]>) {
      const available = new Set(action.payload);
      state.disabledItemKeys = state.disabledItemKeys.filter((key) => available.has(key));
    },
    setEnemyCoverageFilters(state, action: PayloadAction<EnemyCoverageState[]>) {
      state.enemyCoverageFilters = action.payload;
    },
    setStructureCoverageFilters(state, action: PayloadAction<CoverageState[]>) {
      state.structureCoverageFilters = action.payload;
    },
  },
});

export function selectPlanner(state: RootState) {
  return state.planner;
}
export const {
  retainPlannerItems,
  setEnemyCoverageFilters,
  setPlannerMode,
  setPlannerScope,
  setStructureCoverageFilters,
  togglePlannerItem,
} = plannerSlice.actions;
export default plannerSlice.reducer;
