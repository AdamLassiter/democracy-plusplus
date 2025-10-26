import { Box, Card, Divider, Grid, Tab, Tabs, Typography } from "@mui/material";
import { ARMOR_PASSIVES } from "../constants/armor_passives";
import ItemDisplay from "./../itemDisplay";
import { BOOSTERS } from "../constants/boosters";
import { PRIMARIES } from "../constants/primaries";
import { SECONDARIES } from "../constants/secondaries";
import { THROWABLES } from "../constants/throwables";
import { STRATAGEMS } from "../constants/stratagems";
import { useState } from "react";

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
        <TierList index={value} displayName={displayName} items={items} />
      </Box>
    </Box>
  );
}

function TierList({ items }) {
  const lists = Object.groupBy(items, (item) => item.tier);
  const tierOrder = ["s", "a", "b", "c", "d"];

  const sortedTiers = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier]]);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, list]) => {
        return <Grid direction="row" container spacing={1}>
          <Card><Typography variant="h1" style={{ padding: '16px', width: '96px' }}>{tier.toUpperCase()}</Typography></Card>
          {list.map(item => <ItemDisplay item={item} />)}
        </Grid>
      })}
    </Grid>
  </>;
}
