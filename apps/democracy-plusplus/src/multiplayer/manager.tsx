import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ApiError, connectLobbyEvents, pollLobbyPresence, sendLobbyCommand } from "./api";
import {
  applyServerEvent,
  resetLobbySession,
  selectMultiplayer,
  setBackendAvailability,
  setConnectionError,
  setLobbyState,
} from "../slices/multiplayerSlice";
import { checkBackendHealth } from "./api";
import { selectEquipment, setEquipmentState } from "../slices/equipmentSlice";
import { selectMission, setMissionState } from "../slices/missionSlice";
import type { EquipmentState, LobbyMember, LobbyMissionState, MissionState } from "../types";
import { logMissionDebug, useMissionDebugEffect, useMissionDebugRender } from "../utils/missionDebug";

const HEARTBEAT_INTERVAL_MS = 10_000;

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function syncMissionState(localMission: MissionState, lobbyMission: LobbyMissionState): MissionState {
  return {
    ...localMission,
    faction: lobbyMission.faction,
    difficulty: lobbyMission.difficulty,
    objective: lobbyMission.objective,
    state: lobbyMission.state,
    factionLocked: lobbyMission.factionLocked,
    quests: lobbyMission.quests,
    restrictions: lobbyMission.restrictions,
  };
}

export default function MultiplayerManager() {
  const dispatch = useDispatch();
  const multiplayer = useSelector(selectMultiplayer);
  const equipment = useSelector(selectEquipment);
  const mission = useSelector(selectMission);
  const eventSourceRef = useRef<EventSource | null>(null);
  const syncingFromLobbyRef = useRef(false);
  const previousLobbyLoadoutRef = useRef<string | null>(null);

  const currentMember = useMemo(
    () => multiplayer.lobbyState?.members.find((member: LobbyMember) => member.memberId === multiplayer.memberId) ?? null,
    [multiplayer.lobbyState, multiplayer.memberId],
  );
  const isHost = currentMember?.isHost ?? false;
  const lobbyMission = multiplayer.lobbyState?.mission ?? null;
  const lobbyCode = multiplayer.lobbyCode;
  const memberId = multiplayer.memberId;
  const sessionToken = multiplayer.sessionToken;
  const backendAvailable = multiplayer.backendAvailable;
  const lobbyState = multiplayer.lobbyState;

  useMissionDebugRender("MultiplayerManager", {
    backendAvailable,
    lobbyCode,
    memberId,
    isHost,
    missionState: mission.state,
    lobbyMissionState: lobbyMission?.state ?? null,
    syncingFromLobby: syncingFromLobbyRef.current,
  });
  useMissionDebugEffect("MultiplayerManager mission sync inputs", {
    currentMemberId: currentMember?.memberId ?? null,
    mission,
    lobbyMission,
    equipment,
    currentMemberLoadout: currentMember?.loadout ?? null,
    syncingFromLobby: syncingFromLobbyRef.current,
  });

  useEffect(() => {
    void checkBackendHealth()
      .then((available) => dispatch(setBackendAvailability(available)))
      .catch(() => dispatch(setBackendAvailability(false)));
  }, [dispatch]);

  useEffect(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!backendAvailable || !lobbyCode || !memberId || !sessionToken) {
      return;
    }

    eventSourceRef.current = connectLobbyEvents(
      lobbyCode,
      memberId,
      sessionToken,
      (event) => dispatch(applyServerEvent(event)),
      () => dispatch(setConnectionError("Lobby connection lost")),
    );

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [
    dispatch,
    backendAvailable,
    lobbyCode,
    memberId,
    sessionToken,
  ]);

  useEffect(() => {
    if (!backendAvailable || !lobbyCode || !memberId || !sessionToken) {
      return;
    }

    const activeLobbyCode = lobbyCode;
    const activeMemberId = memberId;
    const activeSessionToken = sessionToken;
    let cancelled = false;

    async function runHeartbeat() {
      try {
        const nextLobbyState = await pollLobbyPresence(activeLobbyCode, activeMemberId, activeSessionToken);
        if (!cancelled) {
          dispatch(setLobbyState(nextLobbyState));
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          dispatch(resetLobbySession());
          dispatch(setConnectionError("Disconnected from lobby"));
          return;
        }

        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to refresh lobby presence"));
      }
    }

    void runHeartbeat();
    const intervalId = window.setInterval(() => {
      void runHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [backendAvailable, dispatch, lobbyCode, memberId, sessionToken]);

  useEffect(() => {
    if (!currentMember || !lobbyMission) {
      return;
    }

    if (!isHost) {
      const nextMission = syncMissionState(mission, lobbyMission);
      if (!jsonEqual(nextMission, mission)) {
        logMissionDebug("MultiplayerManager applying lobby mission", {
          missionState: mission.state,
          lobbyMissionState: lobbyMission.state,
        });
        syncingFromLobbyRef.current = true;
        dispatch(setMissionState(nextMission));
      }
    }

  }, [currentMember, dispatch, isHost, lobbyMission, mission]);

  useEffect(() => {
    if (!lobbyState || !memberId || currentMember) {
      return;
    }

    dispatch(resetLobbySession());
    dispatch(setConnectionError("Disconnected from lobby"));
  }, [currentMember, dispatch, lobbyState, memberId]);

  useEffect(() => {
    if (!currentMember) {
      previousLobbyLoadoutRef.current = null;
      return;
    }

    const serialisedLobbyLoadout = JSON.stringify(currentMember.loadout);
    const lobbyLoadoutChanged = previousLobbyLoadoutRef.current !== serialisedLobbyLoadout;
    previousLobbyLoadoutRef.current = serialisedLobbyLoadout;

    if (!lobbyLoadoutChanged || jsonEqual(currentMember.loadout, equipment)) {
      return;
    }

    logMissionDebug("MultiplayerManager applying lobby equipment");
    syncingFromLobbyRef.current = true;
    dispatch(setEquipmentState(currentMember.loadout));
  }, [currentMember, dispatch, equipment]);

  useEffect(() => {
    if (!backendAvailable || !lobbyCode || !memberId || !sessionToken || !lobbyState || syncingFromLobbyRef.current) {
      return;
    }

    if (!currentMember || jsonEqual(currentMember.loadout, equipment)) {
      return;
    }

    void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
      type: "setEquippedLoadout",
      loadout: equipment as EquipmentState,
    }).catch((error: unknown) => {
      dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync loadout"));
    });
  }, [backendAvailable, currentMember, dispatch, equipment, lobbyCode, lobbyState, memberId, sessionToken]);

  useEffect(() => {
    if (!isHost || !backendAvailable || !lobbyCode || !memberId || !sessionToken || !lobbyState || syncingFromLobbyRef.current) {
      return;
    }

    const missionConfigChanged = lobbyState.mission.faction !== mission.faction
      || lobbyState.mission.difficulty !== mission.difficulty
      || lobbyState.mission.objective !== mission.objective
      || lobbyState.mission.state !== mission.state
      || lobbyState.mission.factionLocked !== mission.factionLocked;

    if (missionConfigChanged) {
      logMissionDebug("MultiplayerManager syncing mission config to lobby", {
        localMissionState: mission.state,
        lobbyMissionState: lobbyState.mission.state,
      });
      void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
        type: "setMissionConfig",
        mission: {
          faction: mission.faction,
          difficulty: mission.difficulty,
          objective: mission.objective,
          state: mission.state,
          factionLocked: mission.factionLocked,
        },
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync mission"));
      });
    }

    if (!jsonEqual(lobbyState.mission.quests, mission.quests)) {
      logMissionDebug("MultiplayerManager syncing quests to lobby", {
        localQuestCount: mission.quests.length,
        lobbyQuestCount: lobbyState.mission.quests.length,
      });
      void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
        type: "setQuests",
        quests: mission.quests,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync quests"));
      });
    }

    if (!jsonEqual(lobbyState.mission.restrictions, mission.restrictions)) {
      logMissionDebug("MultiplayerManager syncing restrictions to lobby", {
        localRestrictionCount: mission.restrictions.length,
        lobbyRestrictionCount: lobbyState.mission.restrictions.length,
      });
      void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
        type: "setRestrictions",
        restrictions: mission.restrictions,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync restrictions"));
      });
    }
  }, [backendAvailable, dispatch, isHost, lobbyCode, lobbyState, memberId, mission, sessionToken]);

  useEffect(() => {
    if (syncingFromLobbyRef.current) {
      logMissionDebug("MultiplayerManager clearing syncingFromLobby flag");
    }
    syncingFromLobbyRef.current = false;
  });

  return null;
}
