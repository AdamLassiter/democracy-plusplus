import { supplyCrates } from "../economics/shop";
import { getArmorPassive } from "./armor_passives";
import { getBooster } from "./boosters";
import { getPrimary } from "./primaries";
import { getSecondary } from "./secondaries";
import { getStratagem } from "./stratagems";
import { getThrowable } from "./throwables";
import { getWarbond } from "./warbonds";

function getSupplyCrate(displayName) {
  const crates = supplyCrates();
  return crates.find(crate => crate.displayName === displayName);
}

export function getConstant(displayName) {
  return getArmorPassive(displayName)
    || getBooster(displayName)
    || getPrimary(displayName)
    || getSecondary(displayName)
    || getStratagem(displayName)
    || getThrowable(displayName)
    || getWarbond(displayName)
    || getSupplyCrate(displayName);
}