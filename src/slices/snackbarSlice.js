import { createSlice } from "@reduxjs/toolkit";

const SHOW_SNACKBAR = 'SHOW_SNACKBAR';

const initialState = {
  message: '',
  open: false,
  severity: 'info',
};

const defaultState = {
  message: '',
  open: true,
  severity: 'success',
};

export function selectSnackbar(state) {
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
