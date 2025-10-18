import { Badge, Box, Grid, Tab, Tabs, Typography } from "@mui/material";
import DisplayItem from "../item";
import { useState } from "react";

export default function Inventory({ items }) {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const {
    armor = [],
    booster = [],
    primary = [],
    secondary = [],
    throwable = [],
    Supply = [],
    Eagle = [],
    Defense = [],
    Orbital = [],
  } = Object.groupBy(items, (item) => item.category);
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const shops = [
    ["Armor Passives", armor],
    ["Boosters", booster],
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Stratagems", stratagem],
  ];
  const [, list] = shops[value];

  return <>
    <Typography variant="h4">Shop</Typography>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {shops.map(([displayName]) => <Tab label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ padding: '1em' }}>
        <Shop index={value} items={list} />
      </Box>
    </Box>
  </>;
}

function Shop({ items }) {
  const list = [...items].sort((a, b) => b.cost - a.cost);

  return <>
    <Grid direction="row" container spacing={1}>
      {list.map(item => {
        return <Badge badgeContent={item.cost} color="info">
          <DisplayItem item={item} />
        </Badge>;
      })}
    </Grid>
  </>;
}
