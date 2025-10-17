export function getArmorSize(displayName) {
  return ARMOR_SIZES.find((item) => item.displayName === displayName);
}

export const ARMOR_SIZES = [
  {
    displayName: "Light Armor",
    type: "Equipment",
    category: "armor",
    tags: ["ArmorSize"],
    warbondCode: "",
    internalName: "light",
    imageURL: "",
    tier: "b",
  },
  {
    displayName: "Medium Armor",
    type: "Equipment",
    category: "armor",
    tags: ["ArmorSize"],
    warbondCode: "",
    internalName: "medium",
    imageURL: "",
    tier: "b",
  },
  {
    displayName: "Heavy Armor",
    type: "Equipment",
    category: "armor",
    tags: ["ArmorSize"],
    warbondCode: "",
    internalName: "heavy",
    imageURL: "",
    tier: "b",
  },
];
