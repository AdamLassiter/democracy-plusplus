import { createSlice } from '@reduxjs/toolkit';
import { ARMOR_PASSIVES } from "../constants/armorpassives";
import { BOOSTERS } from "../constants/boosters";
import { PRIMARIES } from "../constants/primaries";
import { SECONDARIES } from "../constants/secondaries";
import { STRATAGEMS } from "../constants/stratagems";
import { THROWABLES } from "../constants/throwables";
import { calculateShopItems } from "../economics/shop";

const initialState = {
  initialised: false,
  onSale: [],
  inventory: [],
};

export const selectShop = (state) => state.shop;

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    resetShop: (state) => {
      const [onSale, inventory] = calculateShopItems([
        ARMOR_PASSIVES,
        BOOSTERS,
        PRIMARIES,
        SECONDARIES,
        THROWABLES,
        STRATAGEMS,
      ].flat());
      state.onSale = onSale;
      state.inventory = inventory;
      state.initialised = true;
    },
  },
});

export const { resetShop } = shopSlice.actions;
export default shopSlice.reducer;
