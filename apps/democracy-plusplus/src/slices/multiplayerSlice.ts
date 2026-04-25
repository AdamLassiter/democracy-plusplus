import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LobbySessionResponse, LobbyState, MultiplayerState, ServerEvent } from "../types";
import type { RootState } from "./index";

const initialState: MultiplayerState = {
  backendAvailable: false,
  availabilityChecked: false,
  connectionStatus: "idle",
  error: null,
  lobbyCode: null,
  memberId: null,
  sessionToken: null,
  displayName: "",
  lobbyState: null,
  lastProcessedDebriefSubmissionId: 0,
};

export function selectMultiplayer(state: RootState) {
  return state.multiplayer;
}

const multiplayerSlice = createSlice({
  name: "multiplayer",
  initialState,
  reducers: {
    setBackendAvailability(state, action: PayloadAction<boolean>) {
      state.backendAvailable = action.payload;
      state.availabilityChecked = true;
      if (!action.payload) {
        state.connectionStatus = "idle";
      }
    },
    setConnecting(state) {
      state.connectionStatus = "connecting";
      state.error = null;
    },
    setLobbySession(state, action: PayloadAction<LobbySessionResponse>) {
      state.connectionStatus = "connected";
      state.error = null;
      state.lobbyCode = action.payload.lobbyCode;
      state.memberId = action.payload.memberId;
      state.sessionToken = action.payload.sessionToken;
      state.lobbyState = action.payload.lobbyState;
      state.lastProcessedDebriefSubmissionId = 0;
    },
    setDisplayName(state, action: PayloadAction<string>) {
      state.displayName = action.payload;
    },
    setLobbyState(state, action: PayloadAction<LobbyState>) {
      state.lobbyState = action.payload;
    },
    applyServerEvent(state, action: PayloadAction<ServerEvent>) {
      if (action.payload.type === "lobbySnapshot") {
        state.lobbyState = action.payload.lobbyState;
      }
    },
    setConnectionError(state, action: PayloadAction<string>) {
      state.connectionStatus = "error";
      state.error = action.payload;
    },
    setLastProcessedDebriefSubmissionId(state, action: PayloadAction<number>) {
      state.lastProcessedDebriefSubmissionId = action.payload;
    },
    resetLobbySession(state) {
      state.connectionStatus = "idle";
      state.error = null;
      state.lobbyCode = null;
      state.memberId = null;
      state.sessionToken = null;
      state.lobbyState = null;
      state.lastProcessedDebriefSubmissionId = 0;
    },
  },
});

export const {
  applyServerEvent,
  resetLobbySession,
  setBackendAvailability,
  setConnecting,
  setConnectionError,
  setDisplayName,
  setLastProcessedDebriefSubmissionId,
  setLobbySession,
  setLobbyState,
} = multiplayerSlice.actions;

export default multiplayerSlice.reducer;
