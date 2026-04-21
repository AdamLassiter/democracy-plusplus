export type Faction = 'Terminids' | 'Automatons' | 'Illuminate';
export type MissionStage = 'brief' | 'generating' | 'loadout' | 'debrief';
export type Tier = 's' | 'a' | 'b' | 'c' | 'd';
export type PlayerCount = 1 | 2 | 3 | 4;

export interface Quest {
  displayName: string;
  description?: string;
  descriptions?: string[];
  category: string;
  tags?: string[];
  rewards?: number[];
  reward?: number;
  values?: number[];
  shortValues?: number[];
  datatype?: 'float';
  completed?: boolean;
  value?: number;
}

export interface Restriction {
  displayName: string;
  description?: string;
  descriptions?: string[];
  category: string;
  tags?: string[];
  tier: Tier | null;
  completed?: boolean;
}

export interface EquipmentState {
  stratagems: Array<string | null>;
  primary: string | null;
  secondary: string | null;
  throwable: string | null;
  armorPassive: string | null;
  booster: string | null;
}

export type LobbyCode = string;
export type LobbyMemberId = string;

export interface LobbyMissionState {
  faction: number;
  difficulty: number;
  objective: string;
  state: MissionStage;
  factionLocked: boolean;
  quests: Quest[];
  restrictions: Restriction[];
  stars: number | null;
}

export interface LobbyMemberLoadout extends EquipmentState {}

export interface LobbyMember {
  memberId: LobbyMemberId;
  displayName: string;
  isHost: boolean;
  loadout: LobbyMemberLoadout;
}

export interface LobbyState {
  lobbyCode: LobbyCode;
  hostMemberId: LobbyMemberId;
  mission: LobbyMissionState;
  members: LobbyMember[];
}

export interface LobbySessionResponse {
  lobbyCode: LobbyCode;
  memberId: LobbyMemberId;
  sessionToken: string;
  lobbyState: LobbyState;
}

export type ClientCommand =
  | { type: 'setDisplayName'; displayName: string }
  | { type: 'setMissionConfig'; mission: Partial<Pick<LobbyMissionState, 'faction' | 'difficulty' | 'objective' | 'state' | 'factionLocked'>> }
  | { type: 'lockMissionConfig' }
  | { type: 'setEquippedLoadout'; loadout: LobbyMemberLoadout }
  | { type: 'setQuests'; quests: Quest[] }
  | { type: 'setRestrictions'; restrictions: Restriction[] }
  | { type: 'setMissionStars'; stars: number | null }
  | { type: 'leaveLobby' };

export interface LobbySnapshotEvent {
  type: 'lobbySnapshot';
  lobbyState: LobbyState;
}

export type ServerEvent = LobbySnapshotEvent;
