import { createSlice } from '@reduxjs/toolkit';
import type { PurchasedState } from '../types';
import type { RootState } from './index';

const initialState: PurchasedState = {
  purchased: [],
};

export function selectPurchased(state: RootState) {
  return state.purchased;
}

const purchasedSlice = createSlice({
  name: 'purchased',
  initialState,
  reducers: {
    addPurchased: (state, action) => {
      const { value } = action.payload
      state.purchased.push(value);
    },
    subtractPurchased: (state, action) => {
      const { value } = action.payload
      state.purchased.splice(state.purchased.indexOf(value), 1);
    },
    setPurchasedState: (_state, action) => {
      return action.payload;
    },
    resetPurchased: () => initialState,
  },
});

export const { addPurchased, subtractPurchased, setPurchasedState, resetPurchased } = purchasedSlice.actions;
export default purchasedSlice.reducer;
