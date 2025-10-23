import { Badge, Box, Card, Grid, Tab, Tabs, Typography } from "@mui/material";
import ItemDisplay from "../itemDisplay";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectShop } from "../../slices/shopSlice";
import { selectCredits, subtractCredits } from "../../slices/creditsSlice";
import { addPurchased } from "../../slices/purchasedSlice";
import SupplyCrates from "./supplyCrate";
import { setSnackbar } from "../../slices/snackbarSlice";

export default function Inventory() {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const { inventory } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  const buy = (item) => {
    if (credits >= item.cost) {
      dispatch(subtractCredits({ amount: item.cost }));
      dispatch(addPurchased({ value: item.displayName }));
      dispatch(setSnackbar({ message: `Purchased ${item.displayName}` }));
    }
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
  } = Object.groupBy(inventory, (item) => item.category);
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const shops = [
    ["Supply Crates", []],
    ["Armor Passives", armor],
    ["Boosters", booster],
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Stratagems", stratagem],
  ];
  const [, list] = shops[value];

  return <>
    <Typography variant="h5">Shop</Typography>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {shops.map(([displayName]) => <Tab label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ padding: '1em' }}>
        {value === 0
          ? <SupplyCrates />
          : <Shop index={value} items={list} onClick={buy} />}
      </Box>
    </Box>
  </>;
}

function Shop({ items, onClick }) {
  const lists = Object.groupBy(items, (item) => item.tier);
  const tierOrder = ["s", "a", "b", "c", "d"];

  const sortedTiers = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier]]);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, items]) => <ShopTier tier={tier} items={items} onClick={onClick} />)}
    </Grid>
  </>;
}

function ShopTier({ items, tier, onClick }) {
  const { credits } = useSelector(selectCredits);
  const list = [...items].sort((a, b) => b.cost - a.cost);

  return <>
    <Grid direction="row" container spacing={1}>
      <Card><Typography variant="h1" style={{ padding: '16px', width: '96px' }}>{tier.toUpperCase()}</Typography></Card>
      {list.map(item => {
        const isAffordable = credits >= item.cost;
        return <Badge badgeContent={item.cost} color={isAffordable ? "info" : "error"}>
          <ItemDisplay item={item} onClick={onClick} isAffordable={isAffordable} />
        </Badge>;
      })}
    </Grid>
  </>;
}
