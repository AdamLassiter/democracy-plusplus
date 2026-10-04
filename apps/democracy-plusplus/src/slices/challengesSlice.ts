import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { ITEMS } from "../constants/items";
import { WARBONDS } from "../constants/warbonds";
import {
  allowedWarbondItems,
  CHALLENGE_DEFINITIONS,
  emptyEquipment,
  equipmentItems,
  ownedItems,
  prepareItemKnockoutPool,
  prepareWarbondKnockoutPool,
  randomLoadout,
  removeUsedItems,
} from "../challenges/engine";
import type {
  ChallengeModeId,
  ChallengesState,
  EquipmentState,
  Item,
} from "../types";
import type { RootState } from "./index";

function seed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

export const initialChallengesState: ChallengesState = {
  version: 1,
  preferredModeId: "budget",
  ownedWarbondCodes: WARBONDS.map((warbond) => warbond.warbondCode),
  randomizer: {
    seed: seed(),
    round: 1,
    prepared: false,
    assignment: emptyEquipment(),
  },
  allItemKnockout: {
    seed: seed(),
    round: 1,
    cycle: 0,
    prepared: false,
    cycleItemIds: [],
    remainingItemIds: [],
    loadout: emptyEquipment(),
  },
  warbondKnockout: {
    seed: seed(),
    round: 1,
    cycle: 0,
    prepared: false,
    cycleWarbondCodes: [],
    remainingWarbondCodes: [],
    activeWarbondCode: null,
    loadout: emptyEquipment(),
  },
};

const modeIds = Object.keys(CHALLENGE_DEFINITIONS) as ChallengeModeId[];

function normaliseInteger(value: unknown, fallback: number, minimum = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.trunc(value))
    : fallback;
}

function normaliseStringArray(value: unknown, allowed?: Set<string>) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry, index, values): entry is string =>
      typeof entry === "string" &&
      (!allowed || allowed.has(entry)) &&
      values.indexOf(entry) === index,
  );
}

function normaliseEquipment(value: unknown): EquipmentState {
  const equipment =
    value && typeof value === "object"
      ? (value as Partial<EquipmentState>)
      : {};
  const itemNames = new Set(ITEMS.map((item) => item.displayName));
  function item(value: unknown) {
    return typeof value === "string" && itemNames.has(value) ? value : null;
  }
  const stratagems = Array.isArray(equipment.stratagems)
    ? equipment.stratagems.slice(0, 4).map(item)
    : [];
  return {
    primary: item(equipment.primary),
    secondary: item(equipment.secondary),
    throwable: item(equipment.throwable),
    armorPassive: item(equipment.armorPassive),
    booster: item(equipment.booster),
    stratagems: Array.from(
      { length: 4 },
      (_unused, index) => stratagems[index] ?? null,
    ),
  };
}

export function normaliseChallengesState(
  value: Partial<ChallengesState> | null | undefined,
): ChallengesState {
  const preferredModeId = modeIds.includes(
    value?.preferredModeId as ChallengeModeId,
  )
    ? value!.preferredModeId!
    : initialChallengesState.preferredModeId;
  const validWarbondCodes = new Set(
    WARBONDS.map((warbond) => warbond.warbondCode),
  );
  const requestedWarbondCodes = Array.isArray(value?.ownedWarbondCodes)
    ? value.ownedWarbondCodes
    : initialChallengesState.ownedWarbondCodes;
  const ownedWarbondCodes = ["none", ...requestedWarbondCodes].filter(
    (code, index, values) =>
      validWarbondCodes.has(code) && values.indexOf(code) === index,
  );
  const itemNames = new Set(ITEMS.map((item) => item.displayName));
  const randomizer = {
    ...initialChallengesState.randomizer,
    ...value?.randomizer,
  };
  const allItemKnockout = {
    ...initialChallengesState.allItemKnockout,
    ...value?.allItemKnockout,
  };
  const warbondKnockout = {
    ...initialChallengesState.warbondKnockout,
    ...value?.warbondKnockout,
  };

  return {
    version: 1,
    preferredModeId,
    ownedWarbondCodes,
    randomizer: {
      seed: normaliseInteger(
        randomizer.seed,
        initialChallengesState.randomizer.seed,
      ),
      round: normaliseInteger(randomizer.round, 1, 1),
      prepared: Boolean(randomizer.prepared),
      assignment: normaliseEquipment(randomizer.assignment),
    },
    allItemKnockout: {
      seed: normaliseInteger(
        allItemKnockout.seed,
        initialChallengesState.allItemKnockout.seed,
      ),
      round: normaliseInteger(allItemKnockout.round, 1, 1),
      cycle: normaliseInteger(allItemKnockout.cycle, 0),
      prepared: Boolean(allItemKnockout.prepared),
      cycleItemIds: normaliseStringArray(
        allItemKnockout.cycleItemIds,
        itemNames,
      ),
      remainingItemIds: normaliseStringArray(
        allItemKnockout.remainingItemIds,
        itemNames,
      ),
      loadout: normaliseEquipment(allItemKnockout.loadout),
    },
    warbondKnockout: {
      seed: normaliseInteger(
        warbondKnockout.seed,
        initialChallengesState.warbondKnockout.seed,
      ),
      round: normaliseInteger(warbondKnockout.round, 1, 1),
      cycle: normaliseInteger(warbondKnockout.cycle, 0),
      prepared: Boolean(warbondKnockout.prepared),
      cycleWarbondCodes: normaliseStringArray(
        warbondKnockout.cycleWarbondCodes,
        validWarbondCodes,
      ).filter((code) => code !== "none"),
      remainingWarbondCodes: normaliseStringArray(
        warbondKnockout.remainingWarbondCodes,
        validWarbondCodes,
      ).filter((code) => code !== "none"),
      activeWarbondCode:
        typeof warbondKnockout.activeWarbondCode === "string" &&
        warbondKnockout.activeWarbondCode !== "none" &&
        validWarbondCodes.has(warbondKnockout.activeWarbondCode)
          ? warbondKnockout.activeWarbondCode
          : null,
      loadout: normaliseEquipment(warbondKnockout.loadout),
    },
  };
}

function allowedNames(state: ChallengesState, modeId: ChallengeModeId) {
  if (modeId === "all-item-knockout") {
    return new Set(state.allItemKnockout.remainingItemIds);
  }
  if (modeId === "warbond-knockout") {
    return new Set(
      allowedWarbondItems(ITEMS, state.warbondKnockout.activeWarbondCode).map(
        (item) => item.displayName,
      ),
    );
  }
  return new Set<string>();
}

function itemSlot(
  item: Item,
): keyof Omit<EquipmentState, "stratagems"> | "stratagems" | null {
  if (item.type === "Stratagem") return "stratagems";
  if (item.category === "primary") return "primary";
  if (item.category === "secondary") return "secondary";
  if (item.category === "throwable") return "throwable";
  if (item.category === "armor") return "armorPassive";
  if (item.category === "booster") return "booster";
  return null;
}

function mutableLoadout(state: ChallengesState, modeId: ChallengeModeId) {
  if (modeId === "all-item-knockout") return state.allItemKnockout.loadout;
  if (modeId === "warbond-knockout") return state.warbondKnockout.loadout;
  return null;
}

const challengesSlice = createSlice({
  name: "challenges",
  initialState: initialChallengesState,
  reducers: {
    setPreferredChallengeMode(state, action: PayloadAction<ChallengeModeId>) {
      if (modeIds.includes(action.payload))
        state.preferredModeId = action.payload;
    },
    setOwnedWarbondCodes(state, action: PayloadAction<string[]>) {
      const valid = new Set(WARBONDS.map((warbond) => warbond.warbondCode));
      state.ownedWarbondCodes = ["none", ...action.payload].filter(
        (code, index, values) =>
          valid.has(code) && values.indexOf(code) === index,
      );
    },
    prepareChallengeRound(state, action: PayloadAction<ChallengeModeId>) {
      const modeId = action.payload;
      if (modeId === "randomizer" && !state.randomizer.prepared) {
        state.randomizer.assignment = randomLoadout(
          ownedItems(ITEMS, state.ownedWarbondCodes),
          state.randomizer.seed + state.randomizer.round,
        );
        state.randomizer.prepared = true;
      }
      if (modeId === "all-item-knockout" && !state.allItemKnockout.prepared) {
        const pool = prepareItemKnockoutPool(
          state.allItemKnockout.remainingItemIds,
          ownedItems(ITEMS, state.ownedWarbondCodes).map(
            (item) => item.displayName,
          ),
        );
        if (pool.reset) {
          state.allItemKnockout.cycle += 1;
          state.allItemKnockout.cycleItemIds = pool.cycleItemIds ?? [];
        }
        state.allItemKnockout.remainingItemIds = pool.remainingItemIds;
        state.allItemKnockout.loadout = emptyEquipment();
        state.allItemKnockout.prepared = true;
      }
      if (modeId === "warbond-knockout" && !state.warbondKnockout.prepared) {
        const pool = prepareWarbondKnockoutPool(
          state.warbondKnockout.remainingWarbondCodes,
          state.ownedWarbondCodes,
          state.warbondKnockout.seed + state.warbondKnockout.cycle + 1,
        );
        if (pool.reset) {
          state.warbondKnockout.cycle += 1;
          state.warbondKnockout.cycleWarbondCodes =
            pool.cycleWarbondCodes ?? [];
        }
        state.warbondKnockout.remainingWarbondCodes =
          pool.remainingWarbondCodes;
        state.warbondKnockout.activeWarbondCode =
          state.warbondKnockout.remainingWarbondCodes[0] ?? null;
        state.warbondKnockout.loadout = emptyEquipment();
        state.warbondKnockout.prepared = true;
      }
    },
    equipChallengeItem(
      state,
      action: PayloadAction<{ modeId: ChallengeModeId; displayName: string }>,
    ) {
      const { modeId, displayName } = action.payload;
      const loadout = mutableLoadout(state, modeId);
      const item = ITEMS.find(
        (candidate) => candidate.displayName === displayName,
      );
      if (!loadout || !item || !allowedNames(state, modeId).has(displayName))
        return;
      const slot = itemSlot(item);
      if (!slot) return;
      if (slot === "stratagems") {
        if (loadout.stratagems.includes(displayName)) return;
        const index = loadout.stratagems.indexOf(null);
        if (index >= 0) loadout.stratagems[index] = displayName;
      } else {
        loadout[slot] = displayName;
      }
    },
    unequipChallengeItem(
      state,
      action: PayloadAction<{ modeId: ChallengeModeId; displayName: string }>,
    ) {
      const loadout = mutableLoadout(state, action.payload.modeId);
      if (!loadout) return;
      for (const slot of [
        "primary",
        "secondary",
        "throwable",
        "armorPassive",
        "booster",
      ] as const) {
        if (loadout[slot] === action.payload.displayName) loadout[slot] = null;
      }
      loadout.stratagems = loadout.stratagems.map((item: string | null) =>
        item === action.payload.displayName ? null : item,
      );
    },
    completeChallengeRound(state, action: PayloadAction<ChallengeModeId>) {
      if (action.payload === "randomizer") {
        state.randomizer.round += 1;
        state.randomizer.prepared = false;
        state.randomizer.assignment = emptyEquipment();
      }
      if (action.payload === "all-item-knockout") {
        state.allItemKnockout.remainingItemIds = removeUsedItems(
          state.allItemKnockout.remainingItemIds,
          state.allItemKnockout.loadout,
        );
        state.allItemKnockout.round += 1;
        state.allItemKnockout.prepared = false;
        state.allItemKnockout.loadout = emptyEquipment();
      }
      if (action.payload === "warbond-knockout") {
        state.warbondKnockout.remainingWarbondCodes =
          state.warbondKnockout.remainingWarbondCodes.filter(
            (code) => code !== state.warbondKnockout.activeWarbondCode,
          );
        state.warbondKnockout.activeWarbondCode = null;
        state.warbondKnockout.round += 1;
        state.warbondKnockout.prepared = false;
        state.warbondKnockout.loadout = emptyEquipment();
      }
    },
    setChallengesState(
      _state,
      action: PayloadAction<Partial<ChallengesState>>,
    ) {
      return normaliseChallengesState(action.payload);
    },
  },
});

export function selectChallenges(state: RootState) {
  return state.challenges;
}

export const selectEffectiveChallengeMode = createSelector(
  [(state: RootState) => state.multiplayer.lobbyState, selectChallenges],
  (lobbyState, challenges) => {
    if (!lobbyState) return challenges.preferredModeId;
    const lobbyMode = lobbyState.challengeSelection?.modeId;
    return modeIds.includes(lobbyMode as ChallengeModeId)
      ? lobbyMode!
      : "budget";
  },
);

export const selectChallengeDefinition = createSelector(
  [selectEffectiveChallengeMode],
  (modeId) => CHALLENGE_DEFINITIONS[modeId],
);

export const selectActiveEquipment = createSelector(
  [
    (state: RootState) => state.equipment,
    selectChallenges,
    selectEffectiveChallengeMode,
  ],
  (budgetEquipment, challenges, modeId) => {
    if (modeId === "budget") return budgetEquipment;
    if (modeId === "randomizer") return challenges.randomizer.assignment;
    if (modeId === "all-item-knockout")
      return challenges.allItemKnockout.loadout;
    return challenges.warbondKnockout.loadout;
  },
);

export const selectChallengeEligibleItems = createSelector(
  [selectChallenges, selectEffectiveChallengeMode],
  (challenges, modeId) => {
    if (modeId === "all-item-knockout") {
      const remaining = new Set(challenges.allItemKnockout.remainingItemIds);
      return ITEMS.filter((item) => remaining.has(item.displayName));
    }
    if (modeId === "warbond-knockout") {
      return allowedWarbondItems(
        ITEMS,
        challenges.warbondKnockout.activeWarbondCode,
      );
    }
    return [];
  },
);

export const selectCanDeployChallenge = createSelector(
  [selectChallenges, selectEffectiveChallengeMode, selectActiveEquipment],
  (challenges, modeId, equipment) => {
    if (modeId !== "all-item-knockout") return true;
    return (
      challenges.allItemKnockout.remainingItemIds.length === 0 ||
      equipmentItems(equipment).length > 0
    );
  },
);

export const {
  completeChallengeRound,
  equipChallengeItem,
  prepareChallengeRound,
  setChallengesState,
  setOwnedWarbondCodes,
  setPreferredChallengeMode,
  unequipChallengeItem,
} = challengesSlice.actions;

export default challengesSlice.reducer;
