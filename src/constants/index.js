import { getArmorPassive } from "./armorpassives";
import { getArmorSet } from "./armorsets";
import { getBooster } from "./boosters";
import { getCape } from "./capes";
import { getHelmet } from "./helmets";
import { getPrimary } from "./primaries";
import { getSecondary } from "./secondaries";
import { getSpecialist } from "./specialists";
import { getStratagem } from "./stratagems";
import { getThrowable } from "./throwables";
import { getWarbond } from "./warbonds";

export function getConstant(displayName) {
  return getArmorPassive(displayName)
    || getArmorSet(displayName)
    || getBooster(displayName)
    || getCape(displayName)
    || getHelmet(displayName)
    || getPrimary(displayName)
    || getSecondary(displayName)
    || getSpecialist(displayName)
    || getStratagem(displayName)
    || getThrowable(displayName)
    || getWarbond(displayName)
}