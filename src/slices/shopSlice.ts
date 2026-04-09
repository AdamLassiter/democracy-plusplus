import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { calculateShopItems, supplyCrates } from "../economics/shop";
import { ITEMS } from '../constants/items';
import { WARBONDS } from '../constants/warbonds';
import { getConstant } from '../constants';
import type { RootState } from './index';
import type { CartEntry, CrateItem, ShopItem, ShopState, Warbond } from '../types';

const initialState: ShopState = {
  initialised: false,
  inventory: [],
  onSale: [],
  supplyCrates: [],
  warbonds: WARBONDS,
  cart: [],
};

function normaliseCartEntry(item: { displayName?: string; cost?: number } | null | undefined): CartEntry | null {
  if (!item?.displayName || item.cost === undefined) {
    return null;
  }

  return {
    displayName: item.displayName,
    cost: item.cost,
  };
}

function hydrateCartItem(item: CartEntry): ShopItem | null {
  const hydratedItem = getConstant(item.displayName);
  if (!hydratedItem) {
    return null;
  }

  return {
    ...hydratedItem,
    cost: item.cost,
  };
}

function normaliseShopState(state: ShopState): ShopState {
  return {
    ...state,
    cart: (state.cart || []).map(normaliseCartEntry).filter((item): item is CartEntry => item !== null),
  };
}

export function selectShop(state: RootState) {
  return {
    ...state.shop,
    cart: state.shop.cart.map(hydrateCartItem).filter((item): item is ShopItem => item !== null),
  };
}

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ value: ShopItem | CrateItem }>) => {
      const { value } = action.payload;
      const cartEntry = normaliseCartEntry(value);
      if (!cartEntry) {
        return;
      }
      state.cart.push(cartEntry);
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
    removeFromCart: (state, action: PayloadAction<{ value: CartEntry }>) => {
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
    buyCart: (state) => {
      state.cart = [];
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
          crate.purchased = false;
        }
      });
      state.cart = [];
    },
    buyOnSale: (state, action: PayloadAction<{ value: ShopItem }>) => {
      const { value } = action.payload;
      const target = state.onSale.find(item => item.displayName === value.displayName);
      if (target) target.purchased = true;
    },
    resetShop: (state) => {
      const warbonds = state.warbonds.map(w => w.warbondCode);
      const items = ITEMS.filter((i) => i.warbondCode && warbonds.includes(i.warbondCode));
      const [onSale, inventory] = calculateShopItems(items);
      state.onSale = onSale;
      state.inventory = inventory;
      state.supplyCrates = supplyCrates();
      state.initialised = true;
      state.cart = [];
    },
    setShopState: (_state, action: PayloadAction<ShopState>) => normaliseShopState(action.payload),
    setWarbonds: (state, action: PayloadAction<{ value: Warbond[] }>) => {
      const { value } = action.payload;
      state.warbonds = value;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  buyCart,
  clearCart,
  buyOnSale,
  setWarbonds,
  setShopState,
  resetShop,
} = shopSlice.actions;

export default shopSlice.reducer;
