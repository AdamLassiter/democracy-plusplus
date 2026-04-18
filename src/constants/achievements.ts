import type { AchievementDefinition, Item } from "../types";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "all-fire",
    displayName: "Trial By Fire",
    description: "Complete a mission using only fire-themed equipment and stratagems.",
  },
  {
    id: "all-explosive",
    displayName: "High Explosive Lifestyle",
    description: "Complete a mission using only explosive-themed equipment and stratagems.",
  },
  {
    id: "all-stealth",
    displayName: "Quiet Professional",
    description: "Complete a mission using only stealth-themed equipment and stratagems.",
  },
  {
    id: "all-gas",
    displayName: "Hazmat Doctrine",
    description: "Complete a mission using only gas-themed equipment and stratagems.",
  },
];

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
