import { createSlice } from '@reduxjs/toolkit';
import { calculateShopItems, supplyCrates } from "../economics/shop";
import { ITEMS } from '../constants/items';

const initialState = {
  initialised: false,
  onSale: [],
  inventory: [],
  supplyCrates: []
};

export const selectShop = (state) => state.shop;

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    buyOnSale: (state, action) => {
      const { value } = action.payload;
      state.onSale.find((item) => item.displayName === value.displayName).purchased = true;
    },
    setShopState: (state, action) => {
      return action.payload;
    },
    resetShop: (state) => {
      const [onSale, inventory] = calculateShopItems(ITEMS);
      state.onSale = onSale;
      state.inventory = inventory;
      state.supplyCrates = supplyCrates();
      state.initialised = true;
    },
  },
});

export const { buyOnSale, setShopState, resetShop } = shopSlice.actions;
export default shopSlice.reducer;
