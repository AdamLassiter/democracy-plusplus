import { createSlice } from '@reduxjs/toolkit';
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

  const categoryToSlotMap: Record<string, keyof Omit<EquipmentState, 'stratagems'> | undefined> = {
    primary: 'primary',
    secondary: 'secondary',
    throwable: 'throwable',
    armor: 'armorPassive',
    booster: 'booster',
  };

  return categoryToSlotMap[item.category];
}

const equipmentSlice = createSlice({
  name: 'equipment',
  initialState,
  reducers: {
    setSlot: (state, action) => {
      const { slot, value } = action.payload;
      state[slot] = value;
    },
    setStratagem: (state, action) => {
      const { slot, value } = action.payload;
      if (0 <= slot && slot <= 3) {
        state.stratagems[slot] = value;
      }
    },
    unsetEquipment: (state, action) => {
      const { value } = action.payload;

      // Unequip non-stratagems
      for (const key of Object.keys(state)) {
        if (key !== 'stratagems' && state[key] === value) {
          state[key] = null;
        }
      }

      // Unequip (one) stratagem
      const stratagemIndex = state.stratagems.indexOf(value);
      state.stratagems = state.stratagems.map((stratagem, i) => stratagemIndex === i ? null : stratagem);
    },
    setEquipmentState: (_state, action) => {
      return action.payload;
    },
    resetEquipment: () => initialState,
  },
});

export const { setSlot, setStratagem, unsetEquipment, setEquipmentState, resetEquipment } = equipmentSlice.actions;
export default equipmentSlice.reducer;
