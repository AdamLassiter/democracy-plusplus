import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connectLobbyEvents, sendLobbyCommand } from "./api";
import { applyServerEvent, selectMultiplayer, setBackendAvailability, setConnectionError } from "../slices/multiplayerSlice";
import { checkBackendHealth } from "./api";
import { selectEquipment, setEquipmentState } from "../slices/equipmentSlice";
import { selectMission, setMissionState } from "../slices/missionSlice";
import type { EquipmentState, LobbyMember, LobbyMissionState, MissionState } from "../types";

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
    if (!currentMember || !lobbyMission) {
      return;
    }

    const nextMission = syncMissionState(mission, lobbyMission);
    if (!jsonEqual(nextMission, mission)) {
      syncingFromLobbyRef.current = true;
      dispatch(setMissionState(nextMission));
    }

    if (!jsonEqual(currentMember.loadout, equipment)) {
      syncingFromLobbyRef.current = true;
      dispatch(setEquipmentState(currentMember.loadout));
    }
  }, [currentMember, dispatch, equipment, lobbyMission, mission]);

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
      void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
        type: "setQuests",
        quests: mission.quests,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync quests"));
      });
    }

    if (!jsonEqual(lobbyState.mission.restrictions, mission.restrictions)) {
      void sendLobbyCommand(lobbyCode, memberId, sessionToken, {
        type: "setRestrictions",
        restrictions: mission.restrictions,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync restrictions"));
      });
    }
  }, [backendAvailable, dispatch, isHost, lobbyCode, lobbyState, memberId, mission, sessionToken]);

  useEffect(() => {
    syncingFromLobbyRef.current = false;
  });

  return null;
}
