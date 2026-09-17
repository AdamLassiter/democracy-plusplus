import type { Response } from "express";
import type {
  ChallengeSelection,
  LobbyCode,
  LobbyMember,
  LobbyMemberId,
  LobbyMissionState,
} from "@plusplus/shared-types";

export type LobbySession = {
  memberId: LobbyMemberId;
  sessionToken: string;
  expiresAt: number;
  lastSeenAt: number;
};

export type LobbyRecord = {
  lobbyCode: LobbyCode;
  hostMemberId: LobbyMemberId;
  createdAt: number;
  updatedAt: number;
  challengeSelection: ChallengeSelection;
  mission: LobbyMissionState;
  members: Map<LobbyMemberId, LobbyMember>;
  sessions: Map<LobbyMemberId, LobbySession>;
  streams: Map<LobbyMemberId, Response>;
};
