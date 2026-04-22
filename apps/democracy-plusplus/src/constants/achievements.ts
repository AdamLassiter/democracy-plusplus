import { loadJson } from "./loadJson";
import type { AchievementDefinition, Item } from "../types";

export const ACHIEVEMENTS = await loadJson<AchievementDefinition[]>('/data/achievements.json');

function hasThemeTag(item: Item, theme: "Fire" | "Explosive" | "Gas" | "Stealth" | "Laser" | "Expendable") {
  return (item.tags ?? []).includes(theme);
}

function filterStratagems(items: Item[]) {
  return items.filter((item) => item.type === "Stratagem");
}

function majorityThemeLoadout(items: Item[], matcher: (_item: Item) => boolean, threshold: number) {
  return items.length > 0 && items.filter(matcher).length >= threshold;
}

function isThemeLoadout(items: Item[], matcher: (_item: Item) => boolean) {
  return items.length > 0 && items.every(matcher);
}

export function unlockedAchievementsForItems(items: Item[]) {
  const unlocked: string[] = [];

  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Fire"))) {
    unlocked.push("all-fire");
  }
  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Explosive"))) {
    unlocked.push("all-explosive");
  }
  if (majorityThemeLoadout(items, (item) => hasThemeTag(item, "Laser"), 4)) {
    unlocked.push("all-laser");
  }
  if (isThemeLoadout(filterStratagems(items), (item) => hasThemeTag(item, "Expendable"))) {
    unlocked.push("all-expendable");
  }
  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Stealth"))) {
    unlocked.push("all-stealth");
  }
  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Gas"))) {
    unlocked.push("all-gas");
  }

  return unlocked;
}
