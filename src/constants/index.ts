import type { Item } from "../types";
import { supplyCrates } from "../economics/shop";
import { getArmorPassive } from "./armor_passives";
import { getBooster } from "./boosters";
import { getPrimary } from "./primaries";
import { getSecondary } from "./secondaries";
import { getStratagem } from "./stratagems";
import { getThrowable } from "./throwables";

function getSupplyCrate(displayName: string) {
  const crates = supplyCrates();
  return crates.find(crate => crate.displayName === displayName);
}

export function getItem(displayName: string): Item | undefined {
  return getArmorPassive(displayName)
    || getBooster(displayName)
    || getPrimary(displayName)
    || getSecondary(displayName)
    || getStratagem(displayName)
    || getThrowable(displayName)
    || getSupplyCrate(displayName);
}
