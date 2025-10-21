import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  purchased: [],
};

export const selectPurchased = (state) => state.purchased;

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
    setPurchasedState: (state, action) => {
      return action.payload;
    },
    resetPurchased: () => initialState,
  },
});

export const { addPurchased, subtractPurchased, setPurchased, setPurchasedState, resetPurchased } = purchasedSlice.actions;
export default purchasedSlice.reducer;
