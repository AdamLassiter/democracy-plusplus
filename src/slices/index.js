import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import creditsReducer from './creditsSlice';
import equipmentReducer from './equipmentSlice';
import missionReducer from './missionSlice';
import preferencesReducer from './preferencesSlice';
import purchasedReducer from './purchasedSlice';
import snackbarReducer from './snackbarSlice';
import shopReducer from './shopSlice';

const persistConfig = {
  key: 'root',
  storage,
};

const appReducer = combineReducers({
  credits: creditsReducer,
  equipment: equipmentReducer,
  mission: missionReducer,
  preferences: preferencesReducer,
  purchased: purchasedReducer,
  shop: shopReducer,
  snackbar: snackbarReducer,
});

function rootReducer(state, action) {
  if (action.type === 'RESET_APP') {
    state = undefined;
  }
  return appReducer(state, action);
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PURGE'],
        ignoredActionPaths: ['result'],
      },
    }),
});

export const persistor = persistStore(store);