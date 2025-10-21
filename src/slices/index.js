import { configureStore } from '@reduxjs/toolkit';
import creditsReducer from './creditsSlice';
import equipmentReducer from './equipmentSlice';
import missionReducer from './missionSlice';
import preferencesReducer from './preferencesSlice';
import purchasedReducer from './purchasedSlice';
import shopReducer from './shopSlice';

export const store = () => configureStore({
  reducer: {
    credits: creditsReducer,
    equipment: equipmentReducer,
    mission: missionReducer,
    preferences: preferencesReducer,
    purchased: purchasedReducer,
    shop: shopReducer,
  }
});