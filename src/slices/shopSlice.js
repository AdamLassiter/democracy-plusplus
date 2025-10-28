import { createSlice } from '@reduxjs/toolkit';
import { calculateShopItems, supplyCrates } from "../economics/shop";
import { ITEMS } from '../constants/items';
import { WARBONDS } from '../constants/warbonds';

const initialState = {
  initialised: false,
  inventory: [],
  onSale: [],
  supplyCrates: [],
  warbonds: WARBONDS,
  cart: [],
};

export function selectShop(state) {
  return state.shop;
}

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { value } = action.payload;
      state.cart.push({ ...value });
      // Mark onSale / supply crates as purchased
      const onSaleItem = state.onSale.find(item => item.displayName === value.displayName && item.cost === value.cost);
      if (onSaleItem) {
        onSaleItem.purchased = true;
      }
      const crate = state.supplyCrates.find(item => item.displayName === value.displayName);
      if (crate) {
        crate.purchased = true;
      }
    },
    removeFromCart: (state, action) => {
      const { value } = action.payload;
      const cartItemIndex = state.cart.findIndex((item) => item.cost === value.cost && item.displayName === value.displayName);
      if (cartItemIndex !== -1) {
        state.cart = state.cart.filter((_item, index) => index !== cartItemIndex);
      }
      // Mark onSale / supply crates as not purchased
      const onSaleItem = state.onSale.find(item => item.cost === value.cost && item.displayName === value.displayName);
      if (onSaleItem) {
        onSaleItem.purchased = false;
      }
      const crateItem = state.supplyCrates.find(item => item.cost === value.cost && item.displayName === value.displayName);
      if (crateItem) {
        crateItem.purchased = false;
      }
    },
    clearCart: (state) => {
      // Mark onSale / supply crates as not purchased
      state.cart.forEach((value) => {
        const onSaleItem = state.onSale.find(item => item.displayName === value.displayName);
        if (onSaleItem) {
          onSaleItem.purchased = false;
        }
        const crate = state.supplyCrates.find(item => item.displayName === value.displayName);
        if (crate) {
          crate.purchased = true;
        }
      });
      state.cart = [];
    },
    buyOnSale: (state, action) => {
      const { value } = action.payload;
      const target = state.onSale.find(item => item.displayName === value.displayName);
      if (target) target.purchased = true;
    },
    buySupplyCrate: (state, action) => {
      const { value, contents } = action.payload;
      const target = state.supplyCrates.find(item => item.displayName === value.displayName);
      if (target) {
        target.purchased = true;
        target.imageUrl = contents.imageUrl;
        target.displayName = contents.displayName;
      }
    },
    resetShop: (state) => {
      const warbonds = state.warbonds.map(w => w.warbondCode);
      const items = ITEMS.filter(i => warbonds.includes(i.warbondCode));
      const [onSale, inventory] = calculateShopItems(items);
      state.onSale = onSale;
      state.inventory = inventory;
      state.supplyCrates = supplyCrates();
      state.initialised = true;
      state.cart = [];
    },
    setShopState: (_state, action) => action.payload,
    setWarbonds: (state, action) => {
      const { value } = action.payload;
      state.warbonds = value;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  clearCart,
  checkout,
  buyOnSale,
  buySupplyCrate,
  setWarbonds,
  setShopState,
  resetShop,
} = shopSlice.actions;

export default shopSlice.reducer;
