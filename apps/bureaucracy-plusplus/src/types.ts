import type { Response } from "express";
import type {
  LobbyCode,
  LobbyMember,
  LobbyMemberId,
  LobbyMissionState,
} from "@plusplus/shared-types";

export type LobbySession = {
  memberId: LobbyMemberId;
  sessionToken: string;
  expiresAt: number;
};

export type LobbyRecord = {
  lobbyCode: LobbyCode;
  hostMemberId: LobbyMemberId;
  createdAt: number;
  updatedAt: number;
  mission: LobbyMissionState;
  members: Map<LobbyMemberId, LobbyMember>;
  sessions: Map<LobbyMemberId, LobbySession>;
  streams: Map<LobbyMemberId, Response>;
};
