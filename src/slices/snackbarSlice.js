import { createSlice } from "@reduxjs/toolkit";

const SHOW_SNACKBAR = 'SHOW_SNACKBAR';

const initialState = {
  open: false,
  message: '',
  severity: 'info',
};

const defaultState = {
  open: true,
  message: '',
  severity: 'success',
};

export const selectSnackbar = (state) => state.snackbar;

const snackbarSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setSnackbar: (state, action) => {
      return {
        ...state,
        ...defaultState,
        ...action.payload,
      };
    }
  }
});

export const { setSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
