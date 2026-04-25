import assert from "node:assert/strict";
import test from "node:test";

import {
  canGenerateMission,
  countPendingDebriefMembers,
  createDebriefStateSnapshot,
  shouldApplyDebriefSubmission,
  syncDebriefStateSnapshot,
  syncMissionState,
} from "../src/multiplayer/missionSync.ts";
import type { LobbyMember, LobbyMissionState, MissionState } from "../src/types.ts";

function createMissionState(overrides: Partial<MissionState> = {}): MissionState {
  return {
    faction: 0,
    objective: "Emergency Evacuation",
    state: "brief",
    prng: 7647,
    playerCount: 1,
    count: 1,
    difficulty: 9,
    mission: 1,
    factionLocked: false,
    quests: [],
    restrictions: [],
    ...overrides,
  };
}

function createLobbyMissionState(overrides: Partial<LobbyMissionState> = {}): LobbyMissionState {
  return {
    faction: 0,
    difficulty: 9,
    objective: "Emergency Evacuation",
    state: "brief",
    factionLocked: false,
    quests: [],
    restrictions: [],
    stars: null,
    debriefSubmissionId: 0,
    ...overrides,
  };
}

function createLobbyMember(overrides: Partial<LobbyMember> = {}): LobbyMember {
  return {
    memberId: "member-1",
    displayName: "Player",
    isHost: false,
    loadout: {
      stratagems: [null, null, null, null],
      primary: null,
      secondary: null,
      throwable: null,
      armorPassive: null,
      booster: null,
    },
    debriefReady: false,
    ...overrides,
  };
}

test("mission generation authority allows single-player and hosts, but blocks guests", () => {
  assert.equal(canGenerateMission(false, false), true);
  assert.equal(canGenerateMission(true, true), true);
  assert.equal(canGenerateMission(true, false), false);
});

test("guest mission sync adopts the host-generated lobby snapshot without losing local seed state", () => {
  const localMission = createMissionState({
    state: "generating",
    prng: 7648,
    factionLocked: true,
  });
  const lobbyMission = createLobbyMissionState({
    state: "loadout",
    factionLocked: true,
    quests: [{ displayName: "Quest", category: "objective", completed: false, reward: 20 }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "c", completed: true }],
  });

  const syncedMission = syncMissionState(localMission, lobbyMission);

  assert.equal(syncedMission.state, "loadout");
  assert.equal(syncedMission.prng, 7648);
  assert.deepEqual(syncedMission.quests, lobbyMission.quests);
  assert.deepEqual(syncedMission.restrictions, lobbyMission.restrictions);
});

test("guest mission sync keeps local debrief state until the guest processes the host submit signal", () => {
  const localMission = createMissionState({
    state: "debrief",
    objective: "Emergency Evacuation",
    quests: [{ displayName: "Quest", category: "objective", completed: true, reward: 20 }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "c", completed: false }],
  });
  const lobbyMission = createLobbyMissionState({
    state: "brief",
    objective: "",
    quests: [],
    restrictions: [],
    debriefSubmissionId: 1,
  });

  const syncedMission = syncMissionState(localMission, lobbyMission, {
    lastProcessedDebriefSubmissionId: 0,
  });

  assert.equal(syncedMission.state, "debrief");
  assert.equal(syncedMission.objective, "Emergency Evacuation");
  assert.deepEqual(syncedMission.quests, localMission.quests);
  assert.deepEqual(syncedMission.restrictions, localMission.restrictions);
});

test("mission sync keeps a processed client in brief while the lobby still shows the old debrief", () => {
  const localMission = createMissionState({
    state: "brief",
    objective: "",
    quests: [],
    restrictions: [],
  });
  const lobbyMission = createLobbyMissionState({
    state: "debrief",
    objective: "Emergency Evacuation",
    quests: [{ displayName: "Quest", category: "objective" }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b" }],
    debriefSubmissionId: 2,
  });

  const syncedMission = syncMissionState(localMission, lobbyMission, {
    lastProcessedDebriefSubmissionId: 2,
  });

  assert.equal(syncedMission.state, "brief");
  assert.equal(syncedMission.objective, "");
});

test("debrief snapshot uses lobby stars and mission payload defaults", () => {
  const mission = createMissionState({
    quests: [{ displayName: "Quest", category: "objective" }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b" }],
  });
  const syncedMission = createLobbyMissionState({
    stars: 4,
    quests: [{ displayName: "Quest", category: "objective" }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b" }],
  });

  const snapshot = createDebriefStateSnapshot(mission, syncedMission);

  assert.equal(snapshot.stars, 4);
  assert.equal(snapshot.quests[0]?.completed, false);
  assert.equal(snapshot.restrictions[0]?.completed, true);
});

test("guest debrief sync preserves local quest and restriction choices when stars update", () => {
  const mission = createMissionState({
    quests: [{ displayName: "Quest", category: "objective" }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b" }],
  });
  const initialSnapshot = createDebriefStateSnapshot(
    mission,
    createLobbyMissionState({
      stars: 3,
      quests: [{ displayName: "Quest", category: "objective", completed: false }],
      restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b", completed: true }],
    }),
  );
  const guestLocalSnapshot = {
    stars: initialSnapshot.stars,
    quests: [{ ...initialSnapshot.quests[0]!, completed: true }],
    restrictions: [{ ...initialSnapshot.restrictions[0]!, completed: false }],
  };

  const syncedSnapshot = syncDebriefStateSnapshot(
    guestLocalSnapshot,
    mission,
    createLobbyMissionState({
      stars: 5,
      quests: [{ displayName: "Quest", category: "objective", completed: false }],
      restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b", completed: true }],
    }),
    false,
  );

  assert.equal(syncedSnapshot.stars, 5);
  assert.equal(syncedSnapshot.quests[0]?.completed, true);
  assert.equal(syncedSnapshot.restrictions[0]?.completed, false);
});

test("pending debrief count only includes non-host members who are not ready", () => {
  const members = [
    createLobbyMember({ memberId: "host", isHost: true, debriefReady: false }),
    createLobbyMember({ memberId: "guest-1", debriefReady: true }),
    createLobbyMember({ memberId: "guest-2", debriefReady: false }),
  ];

  assert.equal(countPendingDebriefMembers(members), 1);
});

test("debrief submission should only apply once per new submission id while in debrief", () => {
  const mission = createMissionState({ state: "debrief" });
  const syncedMission = createLobbyMissionState({ state: "debrief", debriefSubmissionId: 3 });

  assert.equal(shouldApplyDebriefSubmission(mission, syncedMission, 2), true);
  assert.equal(shouldApplyDebriefSubmission(mission, syncedMission, 3), false);
  assert.equal(shouldApplyDebriefSubmission(createMissionState({ state: "brief" }), syncedMission, 2), false);
});

test("host debrief sync preserves local quest and restriction edits while stars stay lobby-backed", () => {
  const mission = createMissionState({
    quests: [{ displayName: "Quest", category: "objective" }],
    restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b" }],
  });
  const syncedSnapshot = syncDebriefStateSnapshot(
    {
      stars: 2,
      quests: [{ displayName: "Quest", category: "objective", completed: false }],
      restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b", completed: true }],
    },
    mission,
    createLobbyMissionState({
      stars: 4,
      quests: [{ displayName: "Quest", category: "objective", completed: true }],
      restrictions: [{ displayName: "Restriction", category: "loadout", tier: "b", completed: false }],
    }),
    true,
  );

  assert.equal(syncedSnapshot.stars, 4);
  assert.equal(syncedSnapshot.quests[0]?.completed, false);
  assert.equal(syncedSnapshot.restrictions[0]?.completed, true);
});
