export type Tier = 's' | 'a' | 'b' | 'c' | 'd';
export type EditableTier = Tier | 'uncategorized';
export type Faction = 'Terminids' | 'Automatons' | 'Illuminate';
export type MissionLength = 'short' | 'long';

export type MissionStage = 'brief' | 'generating' | 'loadout' | 'debrief';

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

export interface Quest extends BaseItem {
  descriptions?: string[];
  category: string;
  rewards?: number[];
  reward?: number;
  values?: number[];
  eradicateValues?: number[];
  blitzValues?: number[];
  commandoValues?: number[];
  datatype?: 'float';
  completed?: boolean;
  value?: number;
}

export interface Restriction extends Omit<BaseItem, 'tier'> {
  descriptions?: string[];
  category: string;
  tier: Tier | null;
  completed?: boolean;
}

export interface Warbond {
  displayName: string;
  warbondCode: string;
}

export interface Difficulty {
  displayName: string;
  missions: number;
}

export interface CreditsState {
  credits: number;
}

export interface EquipmentState {
  stratagems: Array<string | null>;
  primary: string | null;
  secondary: string | null;
  throwable: string | null;
  armorPassive: string | null;
  booster: string | null;
}

export interface MissionState {
  faction: number;
  objective: number;
  state: MissionStage;
  prng: number;
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
  inventory: ShopItem[];
  onSale: ShopItem[];
  supplyCrates: CrateItem[];
  warbonds: Warbond[];
  cart: CartEntry[];
}
