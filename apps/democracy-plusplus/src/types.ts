import type {
  Faction,
  LobbyCode,
  LobbyMemberId,
  LobbySessionResponse,
  LobbyState,
  MissionStage,
  PlayerCount,
  Quest,
  Restriction,
} from "@plusplus/shared-types";

export type {
  EquipmentState,
  Faction,
  LobbyCode,
  LobbyMember,
  LobbyMemberId,
  LobbyMemberLoadout,
  LobbyMissionState,
  LobbySessionResponse,
  LobbyState,
  MissionStage,
  PlayerCount,
  Quest,
  Restriction,
  ServerEvent,
  ClientCommand,
} from "@plusplus/shared-types";

export type Tier = 's' | 'a' | 'b' | 'c' | 'd';
export type EditableTier = Tier | 'uncategorized';
export type MissionLength = 'short' | 'long';

export type EquipmentCategory =
  | 'armor'
  | 'booster'
  | 'primary'
  | 'secondary'
  | 'throwable';

export type StratagemCategory = 'Supply' | 'Eagle' | 'Defense' | 'Orbital';

export type ItemCategory = EquipmentCategory | StratagemCategory | 'crate' | 'questrequired';

export type ItemType = 'Equipment' | 'Stratagem' | 'Care Package';

export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | PropertyValue[]
  | { [key: string]: PropertyValue };

export type ItemProperties = Record<string, PropertyValue>;
export type ObjectiveTag = 'Eradicate' | 'Commando' | 'Blitz';

export interface BaseItem {
  displayName: string;
  imageUrl?: string;
  warbondCode?: string;
  internalName?: string;
  stratagemCode?: string[];
  stock?: number;
  tier: Tier;
  wikiSlug?: string;
  wikiImageUrl?: string | null;
  type?: ItemType;
  category?: string;
  tags?: string[];
  properties?: ItemProperties;
  cost?: number;
  onSale?: boolean;
  purchased?: boolean;
  overrideCost?: number;
}

export interface ShopItem extends BaseItem {
  cost: number;
}

export interface CrateItem extends BaseItem {
  type: 'Care Package';
  category: 'crate';
  contents: Item[];
  cost: number;
  tier: Tier;
}

export type Item = BaseItem | CrateItem;

export interface Objective extends Omit<BaseItem, 'tier'> {
  minDifficulty?: number;
  maxDifficulty?: number;
  missionLength?: MissionLength;
  tier: Record<Faction, Tier | null>;
}

export interface Warbond {
  displayName: string;
  warbondCode: string;
}

export interface Difficulty {
  tier: number;
  displayName: string;
  missions: number;
}

export interface CreditsState {
  credits: number;
}

export interface AchievementDefinition {
  id: string;
  displayName: string;
  description: string;
}

export interface FormFieldPool {
  label: string;
  success: string[];
  warning: string[];
  error: string[];
}

export interface FormTemplate {
  title: string;
  subtitle: string;
  possibleFields: FormFieldPool[];
}

export interface AchievementsState {
  unlocked: string[];
}

export interface MinigamesState {
  stratagemDrillBestScore: number;
  bureaucraticFormsBestScore: number;
}

export interface MissionState {
  faction: number;
  objective: string;
  state: MissionStage;
  prng: number;
  playerCount: PlayerCount;
  count: number;
  difficulty: number;
  mission: number;
  factionLocked: boolean;
  quests: Quest[];
  restrictions: Restriction[];
}

export interface PreferencesState {
  titles: boolean;
  tooltips: boolean;
  missionFlowBanner: boolean;
}

export interface PurchasedState {
  purchased: string[];
}

export interface SnackbarState {
  message: string;
  open: boolean;
  severity: 'error' | 'warning' | 'info' | 'success';
}

export interface CartEntry {
  displayName: string;
  cost: number;
}

export interface PurchaseLogEntry {
  kind: 'purchase';
  id: string;
  timestamp: string;
  itemDisplayName: string;
  cost: number;
}

export interface TierListChangeLogEntry {
  kind: 'tierListChange';
  id: string;
  timestamp: string;
}

export interface MissionOutcome {
  name: string;
  completed: boolean;
}

export interface MissionLogEntry {
  kind: 'mission';
  id: string;
  timestamp: string;
  missionNumber: number;
  faction: Faction;
  objective: string;
  stars: number;
  usedItems: string[];
  usedItemsCost: number;
  quests: MissionOutcome[];
  restrictions: MissionOutcome[];
  totalReward: number;
}

export type LogEntry = PurchaseLogEntry | MissionLogEntry | TierListChangeLogEntry;

export interface LogState {
  entries: LogEntry[];
}

export interface TierListState {
  customized: boolean;
  overrides: Record<string, Tier>;
}

export interface ShopState {
  initialised: boolean;
  playerCount: PlayerCount;
  inventory: ShopItem[];
  onSale: ShopItem[];
  supplyCrates: CrateItem[];
  warbonds: Warbond[];
  cart: CartEntry[];
}

export interface MultiplayerState {
  backendAvailable: boolean;
  availabilityChecked: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  lobbyCode: LobbyCode | null;
  memberId: LobbyMemberId | null;
  sessionToken: string | null;
  displayName: string;
  lobbyState: LobbyState | null;
}

export interface LobbyCommandResponse {
  ok: boolean;
  lobbyState?: LobbyState;
  error?: string;
}

export interface LobbySessionState extends LobbySessionResponse {}
