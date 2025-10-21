import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stratagems: [null, null, null, null],
  primary: null,
  secondary: null,
  throwable: null,
  armorPassive: null,
  booster: null,
};

export const selectEquipment = (state) => state.equipment;

export const getEquipmentSlot = (item) => {
  if (!item) return null;

  if (item.type === 'Stratagem') {
    return 'stratagems';
  }

  const categoryToSlotMap = {
    primary: 'primary',
    secondary: 'secondary',
    throwable: 'throwable',
    armor: 'armorPassive',
    booster: 'booster',
  };

  return categoryToSlotMap[item.category];
};

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
      const stratagemIndex = state.stratagems.find(value);
      if (stratagemIndex !== -1) {
        state.stratagems[stratagemIndex] = null;
      }
    },
    setEquipmentState: (state, action) => {
      return action.payload;
    },
    resetEquipment: () => initialState,
  },
});

export const { setSlot, setStratagem, unsetEquipment, setEquipmentState, resetEquipment } = equipmentSlice.actions;
export default equipmentSlice.reducer;
