import { Box, Tab, Tabs } from "@mui/material";
import { ARMOR_PASSIVES } from "../../constants/armor_passives";
import { BOOSTERS } from "../../constants/boosters";
import { PRIMARIES } from "../../constants/primaries";
import { SECONDARIES } from "../../constants/secondaries";
import { THROWABLES } from "../../constants/throwables";
import { STRATAGEMS } from "../../constants/stratagems";
import { useState } from "react";
import Tier from "./tier";

export default function TierLists() {
  const [value, setValue] = useState(0);

  function handleChange(_event, newValue) {
    setValue(newValue);
  }

  const tierLists = [
    ["Armor Passives", ARMOR_PASSIVES],
    ["Boosters", BOOSTERS],
    ["Primaries", PRIMARIES],
    ["Secondaries", SECONDARIES],
    ["Throwables", THROWABLES],
    ["Stratagems", STRATAGEMS],
  ];
  const [displayName, items] = tierLists[value];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {tierLists.map(([displayName]) => <Tab label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ padding: '1em' }}>
        <Tier index={value} displayName={displayName} items={items} />
      </Box>
    </Box>
  );
}
