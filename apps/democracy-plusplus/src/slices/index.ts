import { combineReducers, configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import achievementsReducer from './achievementsSlice';
import creditsReducer from './creditsSlice';
import equipmentReducer from './equipmentSlice';
import logReducer from './logSlice';
import minigamesReducer from './minigamesSlice';
import missionReducer from './missionSlice';
import multiplayerReducer from './multiplayerSlice';
import preferencesReducer from './preferencesSlice';
import purchasedReducer from './purchasedSlice';
import snackbarReducer from './snackbarSlice';
import shopReducer from './shopSlice';
import tierListReducer from './tierListSlice';

const persistConfig = {
  key: 'root',
  storage,
  blacklist: ['multiplayer'],
};

const appReducer = combineReducers({
  achievements: achievementsReducer,
  credits: creditsReducer,
  equipment: equipmentReducer,
  log: logReducer,
  minigames: minigamesReducer,
  mission: missionReducer,
  multiplayer: multiplayerReducer,
  preferences: preferencesReducer,
  purchased: purchasedReducer,
  shop: shopReducer,
  snackbar: snackbarReducer,
  tierList: tierListReducer,
});

export type RootState = ReturnType<typeof appReducer>;

function rootReducer(state: RootState | undefined, action: UnknownAction) {
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

export type AppDispatch = typeof store.dispatch;
export const persistor = persistStore(store);
