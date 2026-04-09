import { Box, Tab, Tabs } from "@mui/material";
import { ARMOR_PASSIVES } from "../../constants/armor_passives";
import { BOOSTERS } from "../../constants/boosters";
import { PRIMARIES } from "../../constants/primaries";
import { SECONDARIES } from "../../constants/secondaries";
import { THROWABLES } from "../../constants/throwables";
import { STRATAGEMS } from "../../constants/stratagems";
import { useState, type SyntheticEvent } from "react";
import Tier from "./tier";
import PropertyFilter from "../../propertyFilter";
import { filterItemsByPropertyValues } from "../../constants/filters";
import type { Item } from "../../types";
import type { PropertyFilterName } from "../../constants/filters";

export default function TierLists() {
  const [value, setValue] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState<PropertyFilterName[]>([]);

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

  const tierLists: [string, Item[]][] = [
    ["Armor Passives", ARMOR_PASSIVES],
    ["Boosters", BOOSTERS],
    ["Primaries", PRIMARIES],
    ["Secondaries", SECONDARIES],
    ["Throwables", THROWABLES],
    ["Stratagems", STRATAGEMS],
  ];
  const [displayName, items] = tierLists[value];
  const filteredItems = filterItemsByPropertyValues(items, selectedFilters);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {tierLists.map(([displayName]) => <Tab key={displayName} label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ padding: '1em' }}>
        <PropertyFilter selectedFilters={selectedFilters} onChange={setSelectedFilters} />
        <Tier items={filteredItems} />
      </Box>
    </Box>
  );
}
