import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { EquipmentState, Item } from '../types';
import type { RootState } from './index';

const initialState: EquipmentState = {
  stratagems: [null, null, null, null],
  primary: null,
  secondary: null,
  throwable: null,
  armorPassive: null,
  booster: null,
};

export function selectEquipment(state: RootState) {
  return state.equipment;
}

export function getEquipmentSlot(item: Item | undefined | null) {
  if (!item) return null;

  if (item.type === 'Stratagem') {
    return 'stratagems';
  }

  if (!item.category) {
    return null;
  }

  const categoryToSlotMap: Partial<Record<NonNullable<Item['category']>, keyof Omit<EquipmentState, 'stratagems'>>> = {
    primary: 'primary',
    secondary: 'secondary',
    throwable: 'throwable',
    armor: 'armorPassive',
    booster: 'booster',
  };

  return categoryToSlotMap[item.category] ?? null;
}

const equipmentSlice = createSlice({
  name: 'equipment',
  initialState,
  reducers: {
    setSlot: (state, action: PayloadAction<{ slot: keyof Omit<EquipmentState, 'stratagems'>; value: string | null }>) => {
      const { slot, value } = action.payload;
      state[slot] = value;
    },
    setStratagem: (state, action: PayloadAction<{ slot: number; value: string | null }>) => {
      const { slot, value } = action.payload;
      if (0 <= slot && slot <= 3) {
        state.stratagems[slot] = value;
      }
    },
    unsetEquipment: (state, action: PayloadAction<{ value: string }>) => {
      const { value } = action.payload;
      const slots: Array<keyof Omit<EquipmentState, 'stratagems'>> = ['primary', 'secondary', 'throwable', 'armorPassive', 'booster'];

      // Unequip non-stratagems
      for (const key of slots) {
        if (state[key] === value) {
          state[key] = null;
        }
      }

      // Unequip (one) stratagem
      const stratagemIndex = state.stratagems.indexOf(value);
      state.stratagems = state.stratagems.map((stratagem: string | null, i: number) => stratagemIndex === i ? null : stratagem);
    },
    setEquipmentState: (_state, action: PayloadAction<EquipmentState>) => {
      return action.payload;
    },
    resetEquipment: () => initialState,
  },
});

export const { setSlot, setStratagem, unsetEquipment, setEquipmentState, resetEquipment } = equipmentSlice.actions;
export default equipmentSlice.reducer;
