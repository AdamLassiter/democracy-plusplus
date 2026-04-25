import type { LobbyMissionState, MissionState, Quest, Restriction } from "../types";

export type DebriefStateSnapshot = {
  stars: number;
  quests: Quest[];
  restrictions: Restriction[];
};

type MissionSyncOptions = {
  lastProcessedDebriefSubmissionId?: number;
};

function normaliseQuestCompletion(quest: Quest): Quest {
  return {
    ...quest,
    completed: quest.completed ?? false,
  };
}

function normaliseRestrictionCompletion(restriction: Restriction): Restriction {
  return {
    ...restriction,
    completed: restriction.completed ?? true,
  };
}

export function canGenerateMission(hasLobbyState: boolean, isHost: boolean) {
  return !hasLobbyState || isHost;
}

export function syncMissionState(
  localMission: MissionState,
  lobbyMission: LobbyMissionState,
  options: MissionSyncOptions = {},
): MissionState {
  const lastProcessedDebriefSubmissionId = options.lastProcessedDebriefSubmissionId ?? 0;

  // Hold the local debrief open until this client has processed the host's submit signal.
  if (localMission.state === "debrief" && lobbyMission.debriefSubmissionId > lastProcessedDebriefSubmissionId) {
    return localMission;
  }

  // After processing a submit signal locally, don't let a stale lobby debrief pull the client back in.
  if (
    localMission.state === "brief"
    && lobbyMission.state === "debrief"
    && lobbyMission.debriefSubmissionId > 0
    && lastProcessedDebriefSubmissionId >= lobbyMission.debriefSubmissionId
  ) {
    return localMission;
  }

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

export function createDebriefStateSnapshot(
  mission: MissionState,
  syncedMission: LobbyMissionState | null,
): DebriefStateSnapshot {
  return {
    stars: syncedMission?.stars ?? 1,
    quests: (syncedMission?.quests ?? mission.quests).map(normaliseQuestCompletion),
    restrictions: (syncedMission?.restrictions ?? mission.restrictions).map(normaliseRestrictionCompletion),
  };
}

export function syncDebriefStateSnapshot(
  current: DebriefStateSnapshot,
  mission: MissionState,
  syncedMission: LobbyMissionState | null,
  isHost: boolean,
): DebriefStateSnapshot {
  const nextSnapshot = createDebriefStateSnapshot(mission, syncedMission);

  if (isHost) {
    return {
      ...current,
      stars: nextSnapshot.stars,
    };
  }

  return {
    ...current,
    stars: nextSnapshot.stars,
  };
}

export function countPendingDebriefMembers(members: Array<{ isHost: boolean; debriefReady: boolean }> | null | undefined) {
  if (!members) {
    return 0;
  }

  return members.filter((member) => !member.isHost && !member.debriefReady).length;
}

export function shouldApplyDebriefSubmission(
  mission: MissionState,
  syncedMission: LobbyMissionState | null,
  lastProcessedDebriefSubmissionId: number,
) {
  if (!syncedMission) {
    return false;
  }

  return mission.state === "debrief" && syncedMission.debriefSubmissionId > lastProcessedDebriefSubmissionId;
}
