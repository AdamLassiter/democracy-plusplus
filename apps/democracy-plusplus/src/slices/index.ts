import {
  combineReducers,
  configureStore,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import type { PersistedState } from "redux-persist";
import storage from "redux-persist/lib/storage";
import achievementsReducer from "./achievementsSlice";
import challengesReducer, {
  initialChallengesState,
  normaliseChallengesState,
} from "./challengesSlice";
import creditsReducer from "./creditsSlice";
import equipmentReducer from "./equipmentSlice";
import logReducer from "./logSlice";
import minigamesReducer from "./minigamesSlice";
import missionReducer from "./missionSlice";
import multiplayerReducer from "./multiplayerSlice";
import preferencesReducer from "./preferencesSlice";
import plannerReducer from "./plannerSlice";
import purchasedReducer from "./purchasedSlice";
import snackbarReducer from "./snackbarSlice";
import shopReducer from "./shopSlice";
import tierListReducer from "./tierListSlice";

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  blacklist: ["multiplayer", "planner"],
  migrate: async (persistedState: PersistedState) =>
    migratePersistedState(persistedState),
};

const appReducer = combineReducers({
  achievements: achievementsReducer,
  challenges: challengesReducer,
  credits: creditsReducer,
  equipment: equipmentReducer,
  log: logReducer,
  minigames: minigamesReducer,
  mission: missionReducer,
  multiplayer: multiplayerReducer,
  preferences: preferencesReducer,
  planner: plannerReducer,
  purchased: purchasedReducer,
  shop: shopReducer,
  snackbar: snackbarReducer,
  tierList: tierListReducer,
});

export function migratePersistedState(
  persistedState: PersistedState,
): PersistedState {
  if (!persistedState || typeof persistedState !== "object") {
    return persistedState;
  }

  const state = persistedState as unknown as Record<string, unknown>;
  const shop = state.shop as
    { warbonds?: Array<{ warbondCode?: string }> } | undefined;
  const ownedWarbondCodes = shop?.warbonds
    ?.map((warbond) => warbond.warbondCode)
    .filter((code): code is string => Boolean(code));

  return {
    ...state,
    challenges: normaliseChallengesState(
      state.challenges
        ? (state.challenges as Parameters<typeof normaliseChallengesState>[0])
        : {
            ...initialChallengesState,
            ownedWarbondCodes:
              ownedWarbondCodes ?? initialChallengesState.ownedWarbondCodes,
          },
    ),
  } as unknown as PersistedState;
}

export type RootState = ReturnType<typeof appReducer>;

function rootReducer(state: RootState | undefined, action: UnknownAction) {
  if (action.type === "RESET_APP") {
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
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PURGE",
        ],
        ignoredActionPaths: ["result"],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export const persistor = persistStore(store);
