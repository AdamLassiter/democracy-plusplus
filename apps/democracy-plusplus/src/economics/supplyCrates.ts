import type {
  CrateItem,
  EquipmentCategory,
  Item,
  StratagemCategory,
  Tier,
} from "../types";

type CrateTier = Extract<Tier, "a" | "b" | "c">;
type CombinedStratagemCategory = Exclude<StratagemCategory, "Supply">;

interface SupplyCrateFamily {
  key: string;
  label: string;
  imageUrl: string;
  matches: (_item: Item) => boolean;
  costs: Record<CrateTier, number>;
  stock: number;
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
  Stratagem: { a: 24, b: 19, c: 12 },
  Supply: { a: 24, b: 18, c: 12 },
} satisfies Record<
  EquipmentCategory | "Stratagem" | "Supply",
  Record<CrateTier, number>
>;

function tierValue(tier: Tier) {
  return { s: 4, a: 3, b: 2, c: 1, d: 0 }[tier];
}

const CATEGORY_IMAGES: Record<
  EquipmentCategory | "Stratagem" | "Supply",
  string
> = {
  primary: "icons/gun.svg",
  secondary: "icons/gun.svg",
  throwable: "icons/gun.svg",
  armor: "icons/shieldPlus.svg",
  booster: "icons/shieldPlus.svg",
  Stratagem: "icons/missile.svg",
  Supply: "icons/missile.svg",
};

const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  "primary",
  "secondary",
  "throwable",
  "armor",
  "booster",
];
const COMBINED_STRATAGEM_CATEGORIES = new Set<CombinedStratagemCategory>([
  "Orbital",
  "Eagle",
  "Defense",
]);

function toTitleCase(value: string) {
  return value.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
}

function categoryFamily(category: EquipmentCategory): SupplyCrateFamily {
  return {
    key: category.toLowerCase(),
    label: toTitleCase(category),
    imageUrl: CATEGORY_IMAGES[category],
    matches: (item) => item.category === category,
    costs: SUPPLY_CRATE_COSTS[category],
    stock: Infinity,
  };
}

const STRATAGEM_FAMILY: SupplyCrateFamily = {
  key: "stratagem",
  label: "Stratagem",
  imageUrl: CATEGORY_IMAGES.Stratagem,
  matches: (item) =>
    COMBINED_STRATAGEM_CATEGORIES.has(
      item.category as CombinedStratagemCategory,
    ),
  costs: SUPPLY_CRATE_COSTS.Stratagem,
  stock: Infinity,
};

const SUPPLY_FAMILY: SupplyCrateFamily = {
  key: "supply",
  label: "Supply",
  imageUrl: CATEGORY_IMAGES.Supply,
  matches: (item) => item.category === "Supply",
  costs: SUPPLY_CRATE_COSTS.Supply,
  stock: Infinity,
};

const SUPPLY_CRATE_FAMILIES: SupplyCrateFamily[] = [
  ...EQUIPMENT_CATEGORIES.map(categoryFamily),
  STRATAGEM_FAMILY,
  SUPPLY_FAMILY,
];

const LEGACY_STRATAGEM_COSTS: Record<
  CombinedStratagemCategory,
  Record<CrateTier, number>
> = {
  Orbital: { a: 22, b: 18, c: 11 },
  Eagle: { a: 23, b: 19, c: 19 },
  Defense: { a: 22, b: 17, c: 12 },
};

const LEGACY_STRATAGEM_FAMILIES: SupplyCrateFamily[] = (
  ["Orbital", "Eagle", "Defense"] as CombinedStratagemCategory[]
).map((category) => ({
  key: category.toLowerCase(),
  label: category,
  imageUrl: "icons/missile.svg",
  matches: (item) => item.category === category,
  costs: LEGACY_STRATAGEM_COSTS[category],
  stock: Infinity,
}));

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
    stock: family.stock,
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

export function normaliseSupplyCrateStock(
  currentCrates: CrateItem[],
  savedCrates: CrateItem[],
) {
  return currentCrates.map((crate) => {
    const saved = savedCrates.find(
      (item) => item.displayName === crate.displayName,
    );
    const defaultStock = crate.stock ?? 1;
    if (defaultStock === Infinity) {
      return { ...crate, stock: Infinity, purchased: false };
    }
    const stock =
      typeof saved?.stock === "number" && Number.isFinite(saved.stock)
        ? Math.min(defaultStock, Math.max(0, saved.stock))
        : saved?.purchased
          ? Math.max(0, defaultStock - 1)
          : defaultStock;

    return { ...crate, stock, purchased: stock <= 0 };
  });
}

export function findSupplyCrate(
  items: Item[],
  displayName: string,
): CrateItem | undefined {
  return (
    buildSupplyCrates(items).find(
      (crate) => crate.displayName === displayName,
    ) ??
    LEGACY_STRATAGEM_FAMILIES.flatMap((family) =>
      cratesForFamily(items, family),
    ).find((crate) => crate.displayName === displayName)
  );
}

export function takeSupplyCrateFromStock(
  crates: CrateItem[],
  displayName: string,
) {
  const crate = crates.find((item) => item.displayName === displayName);
  if (!crate || (crate.stock ?? 0) <= 0) {
    return false;
  }

  crate.stock = Math.max(0, (crate.stock ?? 0) - 1);
  crate.purchased = crate.stock <= 0;
  return true;
}

export function returnSupplyCrateToStock(
  crates: CrateItem[],
  displayName: string,
) {
  const crate = crates.find((item) => item.displayName === displayName);
  if (!crate) {
    return false;
  }

  crate.stock = (crate.stock ?? 0) + 1;
  crate.purchased = false;
  return true;
}

export function chooseSupplyCrateContents(
  crate: CrateItem,
  allowedWarbondCodes?: readonly string[],
  random: () => number = Math.random,
): Item {
  const allowedWarbonds = allowedWarbondCodes
    ? new Set(allowedWarbondCodes)
    : null;
  const eligibleCrate = allowedWarbonds
    ? {
        ...crate,
        contents: crate.contents.filter(
          (item) => !!item.warbondCode && allowedWarbonds.has(item.warbondCode),
        ),
      }
    : crate;
  const tierOdds = getSupplyCrateTierOdds(eligibleCrate);
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
