import type {
  Item,
  PropertyValue,
  WeaponSourceConfiguration,
  WeaponSourceMode,
} from "../../types";
import { asPropertyRecord, parseCount, parseFirstNumber } from "./parse.ts";

function simulationId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function identity(item: Item) {
  return item.internalName ?? simulationId(item.displayName).replaceAll("-", "");
}

function sourceMetadata(item: Item) {
  return {
    ...(item.wikiSlug ? { sourceUrl: `https://helldivers.wiki.gg/wiki/${item.wikiSlug}` } : {}),
    ...(item.simulation?.sourceVersion ? { sourceVersion: item.simulation.sourceVersion } : {}),
  };
}

function normalizedAttackName(value: string) {
  return value.replace(/^\*+/, "").trim();
}

function directAttackNames(attacks: Record<string, PropertyValue>) {
  return Object.keys(attacks).filter((name) => /^\*(?!\*)/.test(name)).map(normalizedAttackName);
}

function inlineAttacks(section: Record<string, PropertyValue>) {
  return Object.fromEntries(Object.entries(section).filter(([name]) => /^\*/.test(name)));
}

type ReviewedConfiguration = {
  id: string;
  label: string;
  attackIndex?: number;
  section?: "base" | "underbarrel";
  capacity?: number;
  reload?: WeaponSourceConfiguration["reload"];
  capacitySeconds?: number;
  listedDps?: number;
  sourceVersion?: string;
  note?: string;
};

const REVIEWED_CONFIGURATIONS: Record<string, ReviewedConfiguration[]> = {
  argl21onetwo: [
    { id: "8mm-rifle", label: "8 mm rifle", section: "base", reload: { emptySeconds: 3.33, tacticalSeconds: 1.95 }, sourceVersion: "1.006.100" },
    { id: "40mm-grenade", label: "40 mm grenade launcher", section: "underbarrel", reload: { emptySeconds: 2.5 }, sourceVersion: "1.006.100" },
  ],
  smgflam34stoker: [
    { id: "smg", label: "12 mm SMG", section: "base", reload: { emptySeconds: 2.8, tacticalSeconds: 1.73 } },
    {
      id: "flame-projector",
      label: "Flame projector",
      section: "underbarrel",
      capacity: 50,
      reload: { emptySeconds: 2.3, tacticalSeconds: 2.3 },
      capacitySeconds: 6.1,
      listedDps: 150,
    },
  ],
  ar11arbitrator: [
    { id: "4mm-rifle", label: "4 mm rifle", section: "base", reload: { emptySeconds: 3.75, tacticalSeconds: 2.35 } },
    {
      id: "10g-underbarrel",
      label: "10-gauge underbarrel",
      section: "underbarrel",
      reload: { emptySeconds: 2.5, firstRoundSeconds: 1.5, additionalRoundSeconds: 0.33 },
    },
  ],
  sg20halt: [
    {
      id: "flechette",
      label: "Flechette",
      attackIndex: 0,
      capacity: 8,
      reload: { emptySeconds: 3.7, firstRoundSeconds: 1.25, additionalRoundSeconds: 0.2 },
    },
    {
      id: "stun-rounds",
      label: "Stun rounds",
      attackIndex: 1,
      capacity: 8,
      reload: { emptySeconds: 3.7, firstRoundSeconds: 1.25, additionalRoundSeconds: 0.2 },
    },
  ],
  p92warrant: [{
    id: "guided-non-guided",
    label: "Guided / non-guided",
    attackIndex: 0,
    note: "Guidance changes targeting behavior, not the sourced damage or timing timeline.",
  }],
  p33missilepistol: [{
    id: "guided-non-guided",
    label: "Guided / non-guided",
    attackIndex: 0,
    note: "Guidance changes targeting behavior, not the sourced damage or timing timeline.",
  }],
};

const REVIEWED_MODES: Record<string, WeaponSourceMode[]> = {
  vg70variable: [
    { id: "auto", label: "Auto", roundsPerTrigger: 1, consumes: "fixed", simultaneous: true, compatibleFireRatesRpm: [300, 550, 750] },
    { id: "volley", label: "Volley", roundsPerTrigger: 7, consumes: "fixed", simultaneous: true, compatibleFireRatesRpm: [300, 550, 750] },
    { id: "total", label: "Total", consumes: "remaining", simultaneous: false, compatibleFireRatesRpm: [300, 550, 750] },
  ],
  sg22bushwhacker: [
    { id: "semi", label: "Semi", roundsPerTrigger: 1, consumes: "fixed", simultaneous: true },
    { id: "all-barrels", label: "All barrels", roundsPerTrigger: 3, consumes: "fixed", simultaneous: true },
  ],
};

function rawConfigurations(item: Item): WeaponSourceConfiguration[] {
  const entries = Object.entries(item.properties ?? {});
  const nestedRoot = entries.find(([, raw]) => {
    const root = asPropertyRecord(raw);
    return root && Object.entries(root).some(([name, value]) =>
      (name === "Base" || /^Underbarrel\b/i.test(name))
      && directAttackNames(inlineAttacks(asPropertyRecord(value) ?? {})).length > 0,
    );
  });
  if (nestedRoot) {
    const root = asPropertyRecord(nestedRoot[1])!;
    return Object.entries(root).flatMap(([sectionName, rawSection], index) => {
      if (sectionName !== "Base" && !/^Underbarrel\b/i.test(sectionName)) return [];
      const base = asPropertyRecord(rawSection);
      if (!base) return [];
      const attacks = inlineAttacks(base);
      const attackNames = directAttackNames(attacks);
      if (!attackNames.length) return [];
      return [{
        id: index === 0 ? "primary" : `underbarrel-${index}`,
        label: index === 0 ? "Primary weapon" : "Underbarrel",
        ...(index === 0 ? { default: true as const } : {}),
        sourcePath: [nestedRoot[0], sectionName],
        ...sourceMetadata(item),
        attackNames,
        base,
        attacks,
        capacity: parseCount(base.Capacity) ?? undefined,
        fireRatesRpm: parseFirstNumber(base["Fire Rate"]) === null
          ? undefined
          : [parseFirstNumber(base["Fire Rate"])!],
      }];
    });
  }

  const rootEntry = entries.find(([, raw]) => {
    const root = asPropertyRecord(raw);
    return asPropertyRecord(root?.Base) && asPropertyRecord(root?.Attacks);
  });
  if (!rootEntry) return [];
  const root = asPropertyRecord(rootEntry[1])!;
  const base = asPropertyRecord(root.Base)!;
  const attacks = asPropertyRecord(root.Attacks)!;
  return [{
    id: "primary",
    label: "Primary attack",
    default: true,
    sourcePath: [rootEntry[0], "Base"],
    ...sourceMetadata(item),
    attackNames: directAttackNames(attacks),
    base,
    attacks,
    capacity: parseCount(base.Capacity) ?? item.simulation?.capacity,
    fireRatesRpm: item.simulation?.selectableFireRatesRpm?.length
      ? item.simulation.selectableFireRatesRpm
      : parseFirstNumber(base["Fire Rate"]) === null
        ? item.simulation?.fireRateRpm === undefined ? undefined : [item.simulation.fireRateRpm]
        : [parseFirstNumber(base["Fire Rate"])!],
    reload: item.simulation?.reload,
    capacitySeconds: item.simulation?.capacitySeconds,
    listedDps: item.simulation?.listedDps,
  }];
}

export function buildWeaponSourceConfigurations(item: Item): WeaponSourceConfiguration[] {
  const raw = rawConfigurations(item);
  const itemIdentity = identity(item);
  const reviewed = REVIEWED_CONFIGURATIONS[itemIdentity];
  let configurations = raw;

  if (reviewed) {
    configurations = reviewed.flatMap((override, reviewedIndex) => {
      const source = override.section
        ? raw.find((candidate) => override.section === "base"
          ? candidate.sourcePath.at(-1) === "Base"
          : /^Underbarrel\b/i.test(candidate.sourcePath.at(-1) ?? ""))
        : raw[0];
      if (!source) return [];
      const attackNames = override.attackIndex === undefined
        ? source.attackNames
        : source.attackNames[override.attackIndex] ? [source.attackNames[override.attackIndex]] : [];
      if (!attackNames.length) return [];
      return [{
        ...source,
        id: override.id,
        label: override.label,
        ...(reviewedIndex === 0 ? { default: true as const } : { default: undefined }),
        attackNames,
        capacity: override.capacity ?? source.capacity,
        reload: override.reload ?? source.reload,
        capacitySeconds: override.capacitySeconds,
        listedDps: override.listedDps,
        sourceVersion: override.sourceVersion ?? source.sourceVersion,
        note: override.note ?? source.note,
      }];
    });
  }

  const modes = REVIEWED_MODES[itemIdentity];
  if (modes && configurations[0]) {
    const reviewedRates = [...new Set(
      modes.flatMap(({ compatibleFireRatesRpm }) => compatibleFireRatesRpm ?? []),
    )];
    configurations = configurations.map((configuration, index) => index === 0 ? {
      ...configuration,
      firingModes: modes,
      fireRatesRpm: reviewedRates.length ? reviewedRates : configuration.fireRatesRpm,
      reload: itemIdentity === "sg22bushwhacker"
        ? { emptySeconds: 1.75, firstRoundSeconds: 1.1, additionalRoundSeconds: 0.3 }
        : configuration.reload,
    } : configuration);
  }

  return configurations;
}

export function validateWeaponSourceConfigurations(configurations: WeaponSourceConfiguration[]) {
  const problems: string[] = [];
  const configurationIds = new Set<string>();
  for (const configuration of configurations) {
    if (!configuration.id) problems.push("A weapon configuration has no ID.");
    if (configurationIds.has(configuration.id)) {
      problems.push(`Duplicate weapon configuration ID '${configuration.id}'.`);
    }
    configurationIds.add(configuration.id);
    if (!configuration.attackNames.length) {
      problems.push(`Configuration '${configuration.id}' has no resolvable attack.`);
    }
    for (const attackName of configuration.attackNames) {
      const referenced = Object.keys(configuration.attacks).some((candidate) =>
        simulationId(normalizedAttackName(candidate)) === simulationId(attackName),
      );
      if (!referenced) {
        problems.push(`Configuration '${configuration.id}' references missing attack '${attackName}'.`);
      }
    }
    if (configuration.capacity !== undefined && configuration.capacity <= 0) {
      problems.push(`Configuration '${configuration.id}' has a non-positive capacity.`);
    }
    for (const rate of configuration.fireRatesRpm ?? []) {
      if (rate <= 0) problems.push(`Configuration '${configuration.id}' has a non-positive fire rate.`);
    }
    const modeIds = new Set<string>();
    for (const mode of configuration.firingModes ?? []) {
      if (!mode.id) problems.push(`Configuration '${configuration.id}' has a mode with no ID.`);
      if (modeIds.has(mode.id)) problems.push(`Configuration '${configuration.id}' has duplicate mode ID '${mode.id}'.`);
      modeIds.add(mode.id);
      if (mode.roundsPerTrigger !== undefined && mode.roundsPerTrigger <= 0) {
        problems.push(`Mode '${configuration.id}:${mode.id}' has a non-positive rounds-per-trigger value.`);
      }
      for (const rate of mode.compatibleFireRatesRpm ?? []) {
        if (rate <= 0) problems.push(`Mode '${configuration.id}:${mode.id}' has a non-positive fire rate.`);
      }
    }
  }
  return problems;
}
