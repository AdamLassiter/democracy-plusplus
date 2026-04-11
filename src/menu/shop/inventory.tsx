import type { SyntheticEvent } from "react";
import { Badge, Box, Card, Grid, Tab, Tabs, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, selectShop } from "../../slices/shopSlice";
import { selectCredits } from "../../slices/creditsSlice";
import SupplyCrates from "./supplyCrate";
import { setSnackbar } from "../../slices/snackbarSlice";
import PropertyFilter from "../../propertyFilter";
import { filterItemsByPropertyValues } from "../../constants/filters";
import type { CrateItem, Item, ItemCategory, ShopItem, Tier } from "../../types";
import type { PropertyFilterName } from "../../constants/filters";

function isPurchasableItem(item: Item): item is ShopItem | CrateItem {
  return typeof item.cost === "number";
}

export default function Inventory() {
  const [value, setValue] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState<PropertyFilterName[]>([]);

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

  const { inventory } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  function addItemToCart(item: Item) {
    if (isPurchasableItem(item) && (item.stock ?? 1) <= 0) {
      dispatch(setSnackbar({ message: `${item.displayName} is out of stock`, severity: 'warning' }));
    } else if (isPurchasableItem(item) && item.cost <= credits) {
      dispatch(addToCart({ value: item }));
      dispatch(setSnackbar({ message: `${item.displayName} added to cart` }));
    } else {
      dispatch(setSnackbar({ message: `Not enough credits for ${item.displayName}`, severity: 'warning' }));
    }
  }

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
  } = Object.groupBy(inventory, (item) => item.category ?? "crate") as Partial<Record<ItemCategory, ShopItem[]>>;
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const shops: Array<[string, Item[]]> = [
    ["Supply Crates", []],
    ["Armor Passives", armor],
    ["Boosters", booster],
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Stratagems", stratagem],
  ];
  const [, list] = shops[value];
  const filteredItems = filterItemsByPropertyValues(list, selectedFilters);

  return <>
    <Typography variant="h5">Super Earth's Finest</Typography>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {shops.map(([displayName]) => <Tab key={displayName} label={displayName} />)}
        </Tabs>
      </Box>
      <Box sx={{ paddingTop: '1em' }}>
        {value === 0
          ? <SupplyCrates />
          : <>
            <PropertyFilter selectedFilters={selectedFilters} onChange={setSelectedFilters} />
            <Shop items={filteredItems} onClick={addItemToCart} />
          </>}
      </Box>
    </Box>
  </>;
}

function Shop({ items, onClick }: { items: Item[]; onClick: (item: Item) => void }) {
  const lists = Object.groupBy(items, (item) => item.tier) as Partial<Record<Tier, ShopItem[]>>;
  const tierOrder: Tier[] = ["s", "a", "b", "c", "d"];

  const sortedTiers: Array<[Tier, ShopItem[]]> = tierOrder
    .filter((tier) => lists[tier])
    .map((tier) => [tier, lists[tier]!]);

  return <>
    <Grid direction="column" container spacing={1}>
      {sortedTiers.map(([tier, items]) => <ShopTier key={tier} tier={tier} items={items} onClick={onClick} />)}
    </Grid>
  </>;
}

function ShopTier({ items, tier, onClick }: { items: ShopItem[]; tier: string; onClick: (item: Item) => void }) {
  const { credits } = useSelector(selectCredits);
  const list = [...items].sort((a, b) => b.cost - a.cost);

  return <>
    <Grid direction="row" container spacing={1}>
      <Card><Typography variant="h1" style={{ padding: '16px', width: '96px' }}>{tier.toUpperCase()}</Typography></Card>
      {list.map(item => {
        const inStock = (item.stock ?? 0) > 0;
        const isAffordable = credits >= item.cost;
        const itemDisplay = <ItemDisplay item={item} onClick={onClick} isAffordable={isAffordable && inStock} />;
        if (inStock) {
          return <Badge key={item.displayName} badgeContent={`${item.cost}¢`} color={inStock && isAffordable ? "info" : "error"}>
            {itemDisplay}
          </Badge>;
        } else {
          return itemDisplay;
        }
      })}
    </Grid>
  </>;
}
