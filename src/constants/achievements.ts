import { loadJson } from "./loadJson";
import type { AchievementDefinition, Item } from "../types";

export const ACHIEVEMENTS = await loadJson<AchievementDefinition[]>('/data/achievements.json');

function hasThemeTag(item: Item, theme: "Fire" | "Explosive" | "Gas" | "Stealth") {
  return (item.tags ?? []).includes(theme);
}

function isThemeLoadout(items: Item[], matcher: (item: Item) => boolean) {
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
  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Stealth"))) {
    unlocked.push("all-stealth");
  }
  if (isThemeLoadout(items, (item) => hasThemeTag(item, "Gas"))) {
    unlocked.push("all-gas");
  }

  return unlocked;
}
