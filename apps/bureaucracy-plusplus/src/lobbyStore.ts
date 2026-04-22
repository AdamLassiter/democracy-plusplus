import crypto from "node:crypto";
import type { Request, Response } from "express";
import type {
  ClientCommand,
  EquipmentState,
  LobbyCode,
  LobbyMember,
  LobbyMemberId,
  LobbyMissionState,
  LobbySessionResponse,
  LobbyState,
  Quest,
  Restriction,
  ServerEvent,
} from "@plusplus/shared-types";
import { EMPTY_LOBBY_TTL_MS, LOBBY_CLEANUP_INTERVAL_MS, PRESENCE_TTL_MS, SESSION_TTL_MS } from "./config.ts";
import { logEvent } from "./logger.ts";
import type { LobbyRecord, LobbySession } from "./types.ts";

const lobbies = new Map<LobbyCode, LobbyRecord>();

export function startLobbyCleanupTimer() {
  setInterval(cleanupExpiredLobbies, LOBBY_CLEANUP_INTERVAL_MS).unref();
}

export function resetLobbyStoreForTests() {
  lobbies.clear();
}

export function initialMissionState(): LobbyMissionState {
  return {
    faction: 0,
    difficulty: 9,
    objective: "",
    state: "brief",
    factionLocked: false,
    quests: [],
    restrictions: [],
    stars: null,
  };
}

export function emptyLoadout(): EquipmentState {
  return {
    stratagems: [null, null, null, null],
    primary: null,
    secondary: null,
    throwable: null,
    armorPassive: null,
    booster: null,
  };
}

export function createId() {
  return crypto.randomBytes(16).toString("hex");
}

export function normaliseLobbyCode(code: string) {
  return code.trim().toUpperCase();
}

export function normaliseDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 32) : "";
}

export function createLobbyCode(): LobbyCode {
  const alphabet = "123456789";
  let code = "";
  do {
    code = crypto.randomInt(0, 65536).toString();
  } while (lobbies.has(code));
  return code;
}

export function createLobby(displayName: string) {
  const lobbyCode = createLobbyCode();
  const memberId = createId();
  const sessionToken = createId();
  const now = Date.now();

  const hostMember: LobbyMember = {
    memberId,
    displayName,
    isHost: true,
    loadout: emptyLoadout(),
  };

  const lobby: LobbyRecord = {
    lobbyCode,
    hostMemberId: memberId,
    createdAt: now,
    updatedAt: now,
    mission: initialMissionState(),
    members: new Map([[memberId, hostMember]]),
    sessions: new Map([[memberId, { memberId, sessionToken, expiresAt: now + SESSION_TTL_MS, lastSeenAt: now }]]),
    streams: new Map(),
  };

  lobbies.set(lobbyCode, lobby);
  logEvent("lobby.created", {
    lobbyCode,
    hostMemberId: memberId,
    displayName,
  });
  return sessionResponse(lobby, memberId, sessionToken);
}

export function joinLobby(code: string, displayName: string) {
  const lobby = lobbies.get(normaliseLobbyCode(code));
  if (!lobby) {
    return null;
  }

  const memberId = createId();
  const sessionToken = createId();
  const now = Date.now();
  const member: LobbyMember = {
    memberId,
    displayName,
    isHost: false,
    loadout: emptyLoadout(),
  };

  lobby.members.set(memberId, member);
  lobby.sessions.set(memberId, { memberId, sessionToken, expiresAt: now + SESSION_TTL_MS, lastSeenAt: now });
  lobby.updatedAt = now;

  const payload = sessionResponse(lobby, memberId, sessionToken);
  logEvent("lobby.joined", {
    lobbyCode: lobby.lobbyCode,
    memberId,
    displayName,
    memberCount: lobby.members.size,
  });
  broadcastLobby(lobby);
  return payload;
}

export function authenticate(code: string, memberIdValue: unknown, sessionTokenValue: unknown) {
  const lobby = lobbies.get(normaliseLobbyCode(code));
  const memberId = typeof memberIdValue === "string" ? memberIdValue : "";
  const sessionToken = typeof sessionTokenValue === "string" ? sessionTokenValue : "";
  if (!lobby || !memberId || !sessionToken) {
    return null;
  }

  const session = lobby.sessions.get(memberId);
  if (!session || session.sessionToken !== sessionToken || session.expiresAt < Date.now()) {
    return null;
  }

  return { lobby, session };
}

export function attachEventStream(lobby: LobbyRecord, session: LobbySession, request: Request, response: Response) {
  markSessionActive(session);

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();

  lobby.streams.set(session.memberId, response);
  logEvent("lobby.events.connected", {
    lobbyCode: lobby.lobbyCode,
    memberId: session.memberId,
    streamCount: lobby.streams.size,
  });
  sendEvent(response, { type: "lobbySnapshot", lobbyState: toLobbyState(lobby) });

  request.on("close", () => {
    lobby.streams.delete(session.memberId);
    logEvent("lobby.events.disconnected", {
      lobbyCode: lobby.lobbyCode,
      memberId: session.memberId,
      streamCount: lobby.streams.size,
    });
  });
}

export function handleCommand(lobby: LobbyRecord, session: LobbySession, command: ClientCommand) {
  const actor = lobby.members.get(session.memberId);
  if (!actor) {
    throw new Error("Member not found");
  }

  logEvent("lobby.command.received", {
    lobbyCode: lobby.lobbyCode,
    memberId: session.memberId,
    commandType: command.type,
  });
  applyCommand(lobby, actor, command);
  lobby.updatedAt = Date.now();
  markSessionActive(session);
  broadcastLobby(lobby);

  return toLobbyState(lobby);
}

export function pollLobbyPresence(lobby: LobbyRecord, session: LobbySession) {
  markSessionActive(session);
  return toLobbyState(lobby);
}

export function sessionResponse(lobby: LobbyRecord, memberId: LobbyMemberId, sessionToken: string): LobbySessionResponse {
  return {
    lobbyCode: lobby.lobbyCode,
    memberId,
    sessionToken,
    lobbyState: toLobbyState(lobby),
  };
}

export function toLobbyState(lobby: LobbyRecord): LobbyState {
  return {
    lobbyCode: lobby.lobbyCode,
    hostMemberId: lobby.hostMemberId,
    mission: structuredClone(lobby.mission),
    members: [...lobby.members.values()].map((member) => structuredClone(member)),
  };
}

export function sendEvent(response: Response, event: ServerEvent) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function broadcastLobby(lobby: LobbyRecord) {
  const event: ServerEvent = { type: "lobbySnapshot", lobbyState: toLobbyState(lobby) };
  logEvent("lobby.broadcast", {
    lobbyCode: lobby.lobbyCode,
    memberCount: lobby.members.size,
    streamCount: lobby.streams.size,
    state: lobby.mission.state,
    objective: lobby.mission.objective,
    factionLocked: lobby.mission.factionLocked,
  });
  for (const response of lobby.streams.values()) {
    sendEvent(response, event);
  }
}

function markSessionActive(session: LobbySession) {
  const now = Date.now();
  session.expiresAt = now + SESSION_TTL_MS;
  session.lastSeenAt = now;
}

function assertHost(lobby: LobbyRecord, member: LobbyMember) {
  if (member.memberId !== lobby.hostMemberId) {
    throw new Error("Only the host can perform this action");
  }
}

function applyCommand(lobby: LobbyRecord, actor: LobbyMember, command: ClientCommand) {
  switch (command.type) {
    case "setDisplayName": {
      const displayName = normaliseDisplayName(command.displayName);
      if (!displayName) {
        throw new Error("displayName is required");
      }
      actor.displayName = displayName;
      logEvent("lobby.member.renamed", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        displayName,
      });
      return;
    }
    case "setMissionConfig": {
      assertHost(lobby, actor);
      lobby.mission = {
        ...lobby.mission,
        ...command.mission,
      };
      logEvent("lobby.mission.updated", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        mission: command.mission,
      });
      return;
    }
    case "lockMissionConfig": {
      assertHost(lobby, actor);
      lobby.mission.factionLocked = true;
      if (lobby.mission.state === "brief") {
        lobby.mission.state = "generating";
      }
      logEvent("lobby.mission.locked", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        state: lobby.mission.state,
      });
      return;
    }
    case "setEquippedLoadout": {
      actor.loadout = structuredClone(command.loadout);
      logEvent("lobby.loadout.updated", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
      });
      return;
    }
    case "setQuests": {
      assertHost(lobby, actor);
      lobby.mission.quests = structuredClone(command.quests as Quest[]);
      logEvent("lobby.quests.updated", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        count: lobby.mission.quests.length,
      });
      return;
    }
    case "setRestrictions": {
      assertHost(lobby, actor);
      lobby.mission.restrictions = structuredClone(command.restrictions as Restriction[]);
      logEvent("lobby.restrictions.updated", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        count: lobby.mission.restrictions.length,
      });
      return;
    }
    case "setMissionStars": {
      assertHost(lobby, actor);
      lobby.mission.stars = command.stars;
      logEvent("lobby.stars.updated", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
        stars: command.stars,
      });
      return;
    }
    case "leaveLobby": {
      logEvent("lobby.member.left", {
        lobbyCode: lobby.lobbyCode,
        memberId: actor.memberId,
      });
      removeMember(lobby, actor.memberId);
      return;
    }
  }
}

export function cleanupExpiredLobbies() {
  const now = Date.now();
  for (const [code, lobby] of lobbies.entries()) {
    let changed = false;

    for (const [memberId, session] of lobby.sessions.entries()) {
      const sessionExpired = session.expiresAt < now;
      const presenceExpired = session.lastSeenAt < now - PRESENCE_TTL_MS;
      if (sessionExpired || presenceExpired) {
        logEvent("lobby.member.disconnected", {
          lobbyCode: lobby.lobbyCode,
          memberId,
          reason: sessionExpired ? "session_expired" : "presence_expired",
        });
        removeMember(lobby, memberId);
        changed = true;
      }
    }

    if (changed) {
      lobby.updatedAt = now;
      broadcastLobby(lobby);
    }

    if (lobby.members.size === 0 && now - lobby.updatedAt > EMPTY_LOBBY_TTL_MS) {
      logEvent("lobby.expired", {
        lobbyCode: code,
      });
      lobbies.delete(code);
    }
  }
}

function removeMember(lobby: LobbyRecord, memberId: LobbyMemberId) {
  const member = lobby.members.get(memberId);
  if (!member) {
    return false;
  }

  lobby.members.delete(memberId);
  lobby.sessions.delete(memberId);
  const stream = lobby.streams.get(memberId);
  stream?.end();
  lobby.streams.delete(memberId);
  reconcileLobbyHost(lobby);
  return true;
}

function reconcileLobbyHost(lobby: LobbyRecord) {
  const previousHostMemberId = lobby.hostMemberId;
  const previousHost = lobby.members.get(previousHostMemberId);
  if (!previousHost) {
    const nextHost = lobby.members.values().next().value as LobbyMember | undefined;
    lobby.hostMemberId = nextHost?.memberId ?? "";
    if (nextHost && nextHost.memberId !== previousHostMemberId) {
      logEvent("lobby.host.promoted", {
        lobbyCode: lobby.lobbyCode,
        previousHostMemberId,
        hostMemberId: nextHost.memberId,
      });
    }
  }

  for (const member of lobby.members.values()) {
    member.isHost = member.memberId === lobby.hostMemberId;
  }
}
