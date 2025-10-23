import { createSlice } from '@reduxjs/toolkit';
import { calculateShopItems, supplyCrates } from "../economics/shop";
import { ITEMS } from '../constants/items';
import { WARBONDS } from '../constants/warbonds';

const initialState = {
  initialised: false,
  onSale: [],
  inventory: [],
  supplyCrates: [],
  warbonds: WARBONDS,
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
    buySupplyCrate: (state, action) => {
      const { value } = action.payload;
      state.supplyCrates.find((item) => item.displayName === value.displayName).purchased = true;
    },
    setWarbonds: (state, action) => {
      const { value } = action.payload;
      state.warbonds = value;
    },
    setShopState: (state, action) => {
      return action.payload;
    },
    resetShop: (state) => {
      const warbonds = state.warbonds.map((warbond) => warbond.warbondCode);
      const items = ITEMS.filter((item) => warbonds.includes(item.warbondCode));
      const [onSale, inventory] = calculateShopItems(items);
      state.onSale = onSale;
      state.inventory = inventory;
      state.supplyCrates = supplyCrates();
      state.initialised = true;
    },
  },
});

export const { buyOnSale, buySupplyCrate, setWarbonds, setShopState, resetShop } = shopSlice.actions;
export default shopSlice.reducer;
