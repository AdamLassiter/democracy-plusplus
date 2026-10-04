export type ReviewedStratagemDelivery = {
  attackName?: string;
  profileLabel?: string;
  totalPayloads?: number;
  capacity?: number;
  roundsPerMinute?: number;
  note?: string;
  targetExposureUnsupported?: true;
  combineAllAttacks?: true;
};

// Values here are reviewed mechanics absent from the expanded attack tables. Damage values
// always remain sourced from the generated properties; this registry only defines delivery.
export const REVIEWED_STRATAGEM_DELIVERY: Record<
  string,
  ReviewedStratagemDelivery
> = {
  eagle110mmrocketpods: { totalPayloads: 6, capacity: 6 },
  eagle500kgbomb: { totalPayloads: 1, capacity: 1 },
  b100portablehellbomb: { totalPayloads: 1, capacity: 1 },
  bmdc4pack: {
    totalPayloads: 7,
    capacity: 7,
    note: "One charge is held by the detonator and six are stored in the backpack; deployed charges can detonate simultaneously.",
  },
  eagleclusterbomb: {
    attackName: "CLUSTER BOMB P4",
    profileLabel: "Cluster submunition",
    totalPayloads: 64,
    capacity: 64,
    note: "Eight carrier bombs release eight independently resolved submunitions each; carrier impact is excluded because the bombs airburst.",
  },
  eaglestrafingrun: {
    profileLabel: "23 mm HE rounds",
    totalPayloads: 25,
    capacity: 25,
    roundsPerMinute: 4000,
    note: "Models the 25 HE rounds in the sourced 100-round pass; the other 75 direct-only rounds remain outside area output.",
  },
  orbitalrailcannonstrike: { totalPayloads: 1, capacity: 1 },
  orbitallaser: { totalPayloads: 25, capacity: 25 },
  emg101hmgemplacement: {
    profileLabel: "Twin heavy machine guns",
    totalPayloads: 600,
    capacity: 600,
    roundsPerMinute: 660,
    note: "Two 300-round guns fire simultaneously at a sourced combined rate of 11 rounds per second.",
  },
  eat12antitankemplacement: {
    profileLabel: "75 mm APHE cannon",
    totalPayloads: 30,
    capacity: 30,
    note: "The source documents a 30-shell reserve but does not expose a machine-readable firing cadence.",
  },
  lift182warppack: {
    targetExposureUnsupported: true,
    note: "The offensive activation payload is parsed, but its trigger and target interaction are not sourced well enough for target TTK.",
  },
  ms11solosilo: {
    totalPayloads: 1,
    capacity: 1,
    combineAllAttacks: true,
    note: "The one guided missile applies its sourced impact and main explosions once each.",
  },
};
