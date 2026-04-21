import type { Item } from "../types";
import { ARMOR_PASSIVES } from "./armor_passives";
import { BOOSTERS } from "./boosters";
import { PRIMARIES } from "./primaries";
import { SECONDARIES } from "./secondaries";
import { STRATAGEMS } from "./stratagems";
import { THROWABLES } from "./throwables";

export const ITEMS: Item[] = [
  ARMOR_PASSIVES,
  BOOSTERS,
  PRIMARIES,
  SECONDARIES,
  THROWABLES,
  STRATAGEMS,
].flat()
