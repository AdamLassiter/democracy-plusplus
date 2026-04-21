import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { calculateItemStock, calculateShopItems, supplyCrates } from "../economics/shop";
import { clampPlayerCount } from "../utils/playerCount";
import { applyTierOverrides } from "../utils/tierList";
import { ITEMS } from '../constants/items';
import { WARBONDS } from '../constants/warbonds';
import { getItem } from '../constants';
import type { RootState } from './index';
import type { CartEntry, CrateItem, ShopItem, ShopState, Warbond } from '../types';

const initialState: ShopState = {
  initialised: false,
  playerCount: 1,
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

function normaliseStock(displayName: string, stock: unknown, playerCount: number) {
  if (stock === Infinity) {
    return Infinity;
  }

  if (typeof stock === 'number' && Number.isFinite(stock) && stock >= 0) {
    return stock;
  }

  return calculateItemStock(displayName, clampPlayerCount(playerCount));
}

function incrementInventoryStock(items: ShopItem[], displayName: string, playerCount: number) {
  const target = items.find((item) => item.displayName === displayName);
  if (target) {
    const currentStock = normaliseStock(displayName, target.stock, playerCount);
    target.stock = currentStock === Infinity ? Infinity : currentStock + 1;
  }
}

function hydrateCartItem(item: CartEntry): ShopItem | null {
  const hydratedItem = getItem(item.displayName);
  if (!hydratedItem) {
    return null;
  }

  return {
    ...hydratedItem,
    cost: item.cost,
  };
}

function normaliseShopState(state: ShopState): ShopState {
  const playerCount = clampPlayerCount(state.playerCount ?? initialState.playerCount);

  return {
    ...state,
    playerCount,
    inventory: (state.inventory || []).map((item) => ({
      ...item,
      stock: normaliseStock(item.displayName, item.stock, playerCount),
    })),
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
      if ("stock" in value) {
        const inventoryItem = state.inventory.find((item) => item.displayName === value.displayName);
        if (inventoryItem && (inventoryItem.stock ?? 0) <= 0) {
          return;
        }
        if (inventoryItem) {
          inventoryItem.stock = Math.max(0, (inventoryItem.stock ?? 0) - 1);
        }
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
        incrementInventoryStock(state.inventory, value.displayName, state.playerCount);
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
        incrementInventoryStock(state.inventory, value.displayName, state.playerCount);
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
    resetShop: (state, action: PayloadAction<{ missionCount: number | null; playerCount: number; tierOverrides?: Record<string, import("../types").Tier> }>) => {
      const shouldResetStock = !state.initialised || action.payload.missionCount === null || action.payload.missionCount % 3 === 0;
      const playerCount = clampPlayerCount(action.payload.playerCount);
      const warbonds = state.warbonds.map(w => w.warbondCode);
      const items = applyTierOverrides(
        ITEMS.filter((i) => i.warbondCode && warbonds.includes(i.warbondCode)),
        action.payload.tierOverrides ?? {},
      );
      const [onSale, inventory] = calculateShopItems(items);
      const existingStockByName = new Map(
        state.inventory.map((item) => [item.displayName, item.stock ?? calculateItemStock(item.displayName, state.playerCount)]),
      );
      state.playerCount = playerCount;
      state.onSale = onSale;
      state.inventory = inventory.map((item) => ({
        ...item,
        stock: shouldResetStock
          ? calculateItemStock(item.displayName, playerCount)
          : (existingStockByName.get(item.displayName) ?? calculateItemStock(item.displayName, playerCount)),
      }));
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
