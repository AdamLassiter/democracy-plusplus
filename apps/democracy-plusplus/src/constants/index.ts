import type { Item } from "../types";
import { findSupplyCrate } from "../economics/supplyCrates";
import { ITEMS } from "./items";
import { getArmorPassive } from "./armor_passives";
import { getBooster } from "./boosters";
import { getPrimary } from "./primaries";
import { getSecondary } from "./secondaries";
import { getStratagem } from "./stratagems";
import { getThrowable } from "./throwables";

function getSupplyCrate(displayName: string) {
  return findSupplyCrate(ITEMS, displayName);
}

export function getItem(displayName: string): Item | undefined {
  return (
    getArmorPassive(displayName) ||
    getBooster(displayName) ||
    getPrimary(displayName) ||
    getSecondary(displayName) ||
    getStratagem(displayName) ||
    getThrowable(displayName) ||
    getSupplyCrate(displayName)
  );
}
