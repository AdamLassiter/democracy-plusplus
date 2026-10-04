import type { WeaponProfile } from "../../utils/damage/types";

export function humanizeProfileKind(kind: WeaponProfile["kind"]) {
  const label = kind.replaceAll("-", " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} profile`;
}
