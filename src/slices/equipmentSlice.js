import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  stratagems: ["Orbital Smoke Strike", null, null, null],
  primary: "Constitution",
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

      for (const key of Object.keys(state)) {
        if (key !== 'stratagems' && state[key] === value) {
          state[key] = null;
        }
      }

      state.stratagems = state.stratagems.map((item) =>
        item === value ? null : item
      );
    },
    resetEquipment: () => initialState,
  },
});

export const { setSlot, setStratagem, unsetEquipment, resetEquipment } = equipmentSlice.actions;
export default equipmentSlice.reducer;
