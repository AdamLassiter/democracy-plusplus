import type { LobbyState, PlayerCount } from "../types";

export const MIN_PLAYER_COUNT: PlayerCount = 1;
export const MAX_PLAYER_COUNT: PlayerCount = 4;

export function clampPlayerCount(value: unknown): PlayerCount {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MIN_PLAYER_COUNT;
  }

  const rounded = Math.round(value);
  if (rounded <= MIN_PLAYER_COUNT) {
    return MIN_PLAYER_COUNT;
  }
  if (rounded >= MAX_PLAYER_COUNT) {
    return MAX_PLAYER_COUNT;
  }

  return rounded as PlayerCount;
}

export function getEffectivePlayerCount(
  localPlayerCount: PlayerCount,
  lobbyState: LobbyState | null | undefined,
): PlayerCount {
  if (!lobbyState) {
    return localPlayerCount;
  }

  return clampPlayerCount(lobbyState.members.length);
}

export function playerCountMultiplier(playerCount: PlayerCount) {
  return playerCount;
}
