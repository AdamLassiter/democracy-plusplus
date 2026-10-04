import type {
  ChallengeModeId,
  EquipmentState,
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
  ChallengeModeId,
  ChallengeSelection,
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
// Catalog display names are the existing persisted key; this alias centralizes that contract for future migration.
export type ItemId = string;

export type EquipmentCategory =
  | 'armor'
  | 'booster'
  | 'primary'
  | 'secondary'
  | 'throwable';

export type StratagemCategory = 'Supply' | 'Eagle' | 'Defense' | 'Orbital';

export type ItemCategory = EquipmentCategory | StratagemCategory | 'crate' | 'questrequired';

export type ItemType = 'Equipment' | 'Stratagem' | 'Care Package' | 'Warbond';

export type PropertyValue =
  | string
  | number
  | boolean
  | null
  | PropertyValue[]
  | { [key: string]: PropertyValue };

export type ItemProperties = Record<string, PropertyValue>;
export type ObjectiveTag = 'Eradicate' | 'Commando' | 'Blitz';

export interface WeaponSourceMode {
  id: string;
  label: string;
  roundsPerTrigger?: number;
  consumes?: 'fixed' | 'remaining';
  simultaneous?: boolean;
  compatibleFireRatesRpm?: number[];
}

export interface WeaponSourceConfiguration {
  id: string;
  label: string;
  default?: true;
  sourcePath: string[];
  attackNames: string[];
  base: Record<string, PropertyValue>;
  attacks: Record<string, PropertyValue>;
  capacity?: number;
  fireRatesRpm?: number[];
  reload?: WeaponSimulationMetadata['reload'];
  firingModes?: WeaponSourceMode[];
  capacitySeconds?: number;
  listedDps?: number;
  sourceUrl?: string;
  sourceVersion?: string;
  note?: string;
}

export interface WeaponSimulationMetadata {
  reload?: {
    emptySeconds?: number;
    tacticalSeconds?: number;
    perRoundSeconds?: number;
    firstRoundSeconds?: number;
    additionalRoundSeconds?: number;
  };
  fireRateRpm?: number;
  capacity?: number;
  capacitySeconds?: number;
  infiniteCapacity?: true;
  listedDps?: number;
  firingModes?: string[];
  sourceVersion?: string;
  capacitiesByLabel?: Record<string, number>;
  reloadSecondsByLabel?: Record<string, number>;
  selectableFireRatesRpm?: number[];
}

export interface StratagemSimulationMetadata {
  callInSeconds?: number;
  cooldownSeconds?: number;
  rearmSeconds?: number;
  uses?: number | 'unlimited';
  sourceVersion?: string;
}

export interface BaseItem {
  displayName: string;
  description?: string;
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
  simulation?: WeaponSimulationMetadata;
  stratagemSimulation?: StratagemSimulationMetadata;
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

export interface Warbond extends BaseItem {
  type: 'Warbond';
  warbondCode: string;
  tier: Tier;
  legendary?: true;
}

export interface Difficulty {
  tier: number;
  displayName: string;
  missions: number;
}

export interface EnemyVariant {
  displayName: string;
  wikiSlug: string;
  wikiImageUrl: string | null;
  imageUrl: string;
}

export interface EnemyAnatomyPart {
  id?: string;
  name: string;
  count?: number;
  armor: string;
  armorByDifficulty?: Record<string, string>;
  health: string;
  healthByDifficulty?: Record<string, number>;
  durability: string;
  percentToMain?: number;
  damageToMainCapped?: boolean;
  bleed?: {
    constitution: number;
    decayPerSecond: number;
  } | null;
  bleedDescription?: string;
  fatal?: boolean;
  explosionResistance?: number;
  explosionVerificationMode?: string;
  demolitionForce?: number;
}

export interface EnemyAnatomy {
  name: string;
  parts: EnemyAnatomyPart[];
}

export type EnemyFaction = Faction | "Super Earth";

export interface Enemy {
  displayName: string;
  faction: EnemyFaction;
  subfactions: string[];
  description: string;
  enemyClass: string;
  wikiSlug: string;
  wikiImageUrl: string | null;
  imageUrl: string;
  variants: EnemyVariant[];
  anatomy: EnemyAnatomy[];
  elementalMultipliers?: Partial<Record<"Fire" | "Gas" | "Arc" | "Acid", number>>;
  statusThresholds?: Partial<Record<string, { minimum: number; guaranteed: number }>>;
}

export interface BestiaryData {
  subfactions: Record<EnemyFaction, string[]>;
  enemies: Enemy[];
}

export type StructureFaction = EnemyFaction | "Neutral";

export interface StructureTarget {
  name: string;
  demolitionForce: number;
  badr: boolean;
}

export interface Structure {
  id: string;
  displayName: string;
  faction: StructureFaction;
  description: string;
  wikiSlug: string;
  wikiImageUrl: string | null;
  imageUrl: string;
  targets: StructureTarget[];
}

export interface DemolitionAttackSource {
  name: string;
  demolitionForce: number;
  explosive: boolean;
}

export interface DemolitionSource {
  displayName: string;
  wikiSlug: string;
  category: string;
  attacks: DemolitionAttackSource[];
}

export interface StructuresData {
  structures: Structure[];
  demolitionSources: DemolitionSource[];
}

export type CoverageState = "none" | "partial" | "full";
export type EnemyCoverageState = "none" | "partialResisted" | "partial" | "fullResisted" | "full";

export interface AttackCapability {
  itemName: string;
  attackName: string;
  armorPenetration: number | null;
  demolitionForce: number | null;
  explosive: boolean;
}

export type PlannerScope = "local" | "squad" | string;

export interface PlannerState {
  mode: "browse" | "planner";
  scope: PlannerScope;
  disabledItemKeys: string[];
  enemyCoverageFilters: EnemyCoverageState[];
  structureCoverageFilters: CoverageState[];
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
  detailedAntiTank: boolean;
  detailedDemolitionForce: boolean;
  itemDisplaySize: 'large' | 'small';
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
  modeId?: ChallengeModeId;
  missionNumber: number;
  faction: Faction;
  objective: string;
  stars: number;
  usedItems: string[];
  usedItemsCost?: number;
  quests?: MissionOutcome[];
  restrictions?: MissionOutcome[];
  totalReward?: number;
}

export interface RandomizerRunState {
  seed: number;
  round: number;
  prepared: boolean;
  assignment: EquipmentState;
}

export interface AllItemKnockoutRunState {
  seed: number;
  round: number;
  cycle: number;
  prepared: boolean;
  cycleItemIds: ItemId[];
  remainingItemIds: ItemId[];
  loadout: EquipmentState;
}

export interface WarbondKnockoutRunState {
  seed: number;
  round: number;
  cycle: number;
  prepared: boolean;
  cycleWarbondCodes: string[];
  remainingWarbondCodes: string[];
  activeWarbondCode: string | null;
  loadout: EquipmentState;
}

export interface ChallengesState {
  version: 1;
  preferredModeId: ChallengeModeId;
  ownedWarbondCodes: string[];
  randomizer: RandomizerRunState;
  allItemKnockout: AllItemKnockoutRunState;
  warbondKnockout: WarbondKnockoutRunState;
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
  lastProcessedDebriefSubmissionId: number;
}

export interface LobbyCommandResponse {
  ok: boolean;
  lobbyState?: LobbyState;
  error?: string;
}

export interface LobbySessionState extends LobbySessionResponse {}
