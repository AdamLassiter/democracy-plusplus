import { createSlice } from "@reduxjs/toolkit";
import type { SnackbarState } from "../types";
import type { RootState } from "./index";

const initialState: SnackbarState = {
  message: '',
  open: false,
  severity: 'info',
};

const defaultState: SnackbarState = {
  message: '',
  open: true,
  severity: 'success',
};

export function selectSnackbar(state: RootState) {
  return state.snackbar;
}

const snackbarSlice = createSlice({
  initialState,
  name: 'shop',
  reducers: {
    setSnackbar: (state, action) => ({
      ...state,
      ...defaultState,
      ...action.payload,
    })
  }
});

export const { setSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
