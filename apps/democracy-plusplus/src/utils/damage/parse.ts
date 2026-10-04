import type { PropertyValue } from "../../types";

export function asPropertyRecord(value: PropertyValue | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, PropertyValue>
    : null;
}

export function parseFirstNumber(value: PropertyValue | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDamageValue(value: PropertyValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { amount: value, damageType: "Damage" };
  }
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*([^\d-].*)?$/);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;
  return {
    amount,
    damageType: match[2]?.trim() || "Damage",
  };
}

export function parseCount(value: PropertyValue | undefined) {
  const parsed = parseFirstNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
