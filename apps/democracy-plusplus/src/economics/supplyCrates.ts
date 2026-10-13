import type {
  CrateItem,
  EquipmentCategory,
  Item,
  StratagemCategory,
  Tier,
} from "../types";

type SupplyCrateCategory = EquipmentCategory | StratagemCategory;
type CrateTier = Extract<Tier, "a" | "b" | "c">;

interface SupplyCrateFamily {
  key: string;
  label: string;
  imageUrl: string;
  matches: (_item: Item) => boolean;
  costs: Record<CrateTier, number>;
}

export interface SupplyCrateTierOdds {
  tier: Tier;
  probability: number;
  items: Item[];
}

const CRATE_TIERS: CrateTier[] = ["a", "b", "c"];
const TIER_WEIGHTS_BY_DISTANCE = [60, 25, 10, 5] as const;
const SUPPLY_CRATE_COSTS = {
  primary: { a: 21, b: 15, c: 10 },
  secondary: { a: 15, b: 9, c: 6 },
  throwable: { a: 18, b: 12, c: 7 },
  armor: { a: 9, b: 7, c: 5 },
  booster: { a: 13, b: 9, c: 5 },
  Orbital: { a: 22, b: 18, c: 11 },
  Eagle: { a: 23, b: 19, c: 19 },
  Defense: { a: 22, b: 17, c: 12 },
  Supply: { a: 24, b: 18, c: 12 },
} satisfies Record<SupplyCrateCategory, Record<CrateTier, number>>;

function tierValue(tier: Tier) {
  return { s: 4, a: 3, b: 2, c: 1, d: 0 }[tier];
}

const CATEGORY_IMAGES: Record<SupplyCrateCategory, string> = {
  primary: "icons/gun.svg",
  secondary: "icons/gun.svg",
  throwable: "icons/gun.svg",
  armor: "icons/shieldPlus.svg",
  booster: "icons/shieldPlus.svg",
  Orbital: "icons/missile.svg",
  Eagle: "icons/missile.svg",
  Defense: "icons/missile.svg",
  Supply: "icons/missile.svg",
};

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "primary",
  "secondary",
  "throwable",
  "armor",
  "booster",
];
const STRATAGEM_CATEGORIES: StratagemCategory[] = [
  "Orbital",
  "Eagle",
  "Defense",
  "Supply",
];

function toTitleCase(value: string) {
  return value.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
}

function categoryFamily(category: SupplyCrateCategory): SupplyCrateFamily {
  return {
    key: category.toLowerCase(),
    label: toTitleCase(category),
    imageUrl: CATEGORY_IMAGES[category],
    matches: (item) => item.category === category,
    costs: SUPPLY_CRATE_COSTS[category],
  };
}

const SUPPLY_CRATE_FAMILIES: SupplyCrateFamily[] = [
  ...EQUIPMENT_CATEGORIES.map(categoryFamily),
  ...STRATAGEM_CATEGORIES.map(categoryFamily),
];

const LEGACY_STRATAGEM_FAMILY: SupplyCrateFamily = {
  key: "stratagem",
  label: "Stratagem",
  imageUrl: "icons/missile.svg",
  matches: (item) => item.type === "Stratagem",
  costs: { a: 24, b: 18, c: 12 },
};

function tieredCrate(
  items: Item[],
  family: SupplyCrateFamily,
  grade: CrateTier,
): CrateItem {
  return {
    displayName: `${grade.toUpperCase()}-Tier ${family.label} Crate`,
    type: "Care Package",
    category: "crate",
    tags: ["lootbox"],
    contents: items.filter(
      (item) =>
        family.matches(item) && tierValue(item.tier) >= tierValue(grade),
    ),
    warbondCode: "none",
    internalName: `${grade}-${family.key}-supplycrate`,
    imageUrl: family.imageUrl,
    cost: family.costs[grade],
    tier: grade,
  };
}

function cratesForFamily(items: Item[], family: SupplyCrateFamily) {
  return CRATE_TIERS.map((grade) => tieredCrate(items, family, grade));
}

export function buildSupplyCrates(items: Item[]): CrateItem[] {
  return SUPPLY_CRATE_FAMILIES.flatMap((family) =>
    cratesForFamily(items, family),
  );
}

export function findSupplyCrate(
  items: Item[],
  displayName: string,
): CrateItem | undefined {
  return (
    buildSupplyCrates(items).find(
      (crate) => crate.displayName === displayName,
    ) ??
    cratesForFamily(items, LEGACY_STRATAGEM_FAMILY).find(
      (crate) => crate.displayName === displayName,
    )
  );
}

export function chooseSupplyCrateContents(
  crate: CrateItem,
  random: () => number = Math.random,
): Item {
  const tierOdds = getSupplyCrateTierOdds(crate);
  const tierRoll = boundedRandom(random);
  let cumulativeProbability = 0;
  let selectedTier = tierOdds[tierOdds.length - 1];

  for (const tier of tierOdds) {
    cumulativeProbability += tier.probability;
    if (tierRoll < cumulativeProbability) {
      selectedTier = tier;
      break;
    }
  }

  const itemIndex = Math.floor(
    boundedRandom(random) * selectedTier.items.length,
  );
  return selectedTier.items[itemIndex];
}

function boundedRandom(random: () => number) {
  return Math.max(0, Math.min(random(), 1 - Number.EPSILON));
}

export function getSupplyCrateTierOdds(
  crate: CrateItem,
): SupplyCrateTierOdds[] {
  if (crate.contents.length === 0) {
    throw new Error(`Supply crate has no contents: ${crate.displayName}`);
  }

  const crateTierValue = tierValue(crate.tier);
  const itemsByTier = Object.groupBy(crate.contents, (item) => item.tier);
  const weightedTiers = Object.entries(itemsByTier)
    .map(([tier, items]) => {
      const distance = tierValue(tier as Tier) - crateTierValue;
      const weight = TIER_WEIGHTS_BY_DISTANCE[distance];
      return { tier: tier as Tier, items: items ?? [], distance, weight };
    })
    .filter(
      (entry): entry is typeof entry & { weight: number } =>
        entry.distance >= 0 && entry.weight !== undefined,
    )
    .sort((left, right) => left.distance - right.distance);
  const totalWeight = weightedTiers.reduce(
    (total, tier) => total + tier.weight,
    0,
  );

  if (totalWeight === 0) {
    throw new Error(
      `Supply crate has no eligible contents: ${crate.displayName}`,
    );
  }

  return weightedTiers.map(({ tier, items, weight }) => ({
    tier,
    items,
    probability: weight / totalWeight,
  }));
}

export function calculateSupplyCrateExpectedValue(
  crate: CrateItem,
  valueOf: (_item: Item) => number,
) {
  return getSupplyCrateTierOdds(crate).reduce((expectedValue, tier) => {
    const averageTierValue =
      tier.items.reduce((total, item) => total + valueOf(item), 0) /
      tier.items.length;
    return expectedValue + tier.probability * averageTierValue;
  }, 0);
}
