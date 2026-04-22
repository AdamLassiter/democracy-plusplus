import type { SyntheticEvent } from "react";
import { Box, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addPurchased, selectPurchased, subtractPurchased } from "../../slices/purchasedSlice";
import { getItem } from "../../constants";
import ItemDisplay from "../../utils/itemDisplay";
import { getEquipmentSlot, selectEquipment, setSlot, setStratagem, unsetEquipment } from "../../slices/equipmentSlice";
import { useMemo, useState } from "react";
import { chooseSupplyCrateContents, itemCost } from "../../economics/shop";
import { setSnackbar } from "../../slices/snackbarSlice";
import PropertyFilter from "../../utils/propertyFilter";
import { filterItemsByPropertyValues } from "../../constants/filters";
import type { Item, ItemCategory } from "../../types";
import type { PropertyFilterName } from "../../constants/filters";

function isCrateItem(item: Item): item is Extract<Item, { category: "crate" }> {
  return item.category === "crate" && "contents" in item;
}

export default function Purchases() {
  const equipment = useSelector(selectEquipment);
  const dispatch = useDispatch();
  const { purchased: purchased_ } = useSelector(selectPurchased);
  const purchased = purchased_.map(getItem).filter(Boolean) as Item[];

  const [value, setValue] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState<PropertyFilterName[]>([]);

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

  const purchasedCost = useMemo(() => {
    const pricedItems = purchased.map(itemCost);
    return pricedItems.reduce((sum, item) => sum + item, 0);
  }, [purchased]);

  const {
    armor = [],
    booster = [],
    primary = [],
    secondary = [],
    throwable = [],
    crate = [],
    Supply = [],
    Eagle = [],
    Defense = [],
    Orbital = [],
  } = Object.groupBy(purchased, (item) => item.category ?? "crate") as Partial<Record<ItemCategory, Item[]>>;
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const purchasedLists: Array<[string, Item[]]> = [
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Armor Passives", armor],
    ["Stratagems", stratagem],
    ["Boosters", booster],
    ["Supply Crates", crate],
  ];
  const [, items] = purchasedLists[value];
  const filteredItems = filterItemsByPropertyValues(items, selectedFilters);

  function equip(displayName: string) {
    const item = getItem(displayName);
    if (!item) {
      return;
    }
    const slot = getEquipmentSlot(item);
    const firstEmptyStratagem = equipment.stratagems.indexOf(null);

    if (item.category === "crate") {
      if (!isCrateItem(item)) {
        return;
      }
      const contents = chooseSupplyCrateContents(item);
      dispatch(subtractPurchased({ value: displayName }));
      dispatch(addPurchased({ value: contents.displayName }));
      dispatch(setSnackbar({ message: `Unwrapped ${contents.displayName}!` }));
    } else if (slot && slot !== 'stratagems') {
      const equippedItem = equipment[slot];
      if (equippedItem) {
        dispatch(unsetEquipment({ value: equippedItem }));
        dispatch(addPurchased({ value: equippedItem }));
      }
      dispatch(setSlot({ slot, value: displayName }));
      dispatch(subtractPurchased({ value: displayName }));
    } else if (firstEmptyStratagem !== -1) {
      dispatch(setStratagem({ slot: firstEmptyStratagem, value: displayName }));
      dispatch(subtractPurchased({ value: displayName }));
    }
  }

  return <>
    <Box sx={{ alignItems: "baseline", display: "flex", gap: 1 }}>
      <Typography variant="h5">Inventory</Typography>
      <Typography color="text.secondary" variant="subtitle1">{Math.floor(purchasedCost / 2)} ~ {purchasedCost}¢</Typography>
    </Box>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {purchasedLists.map(([displayName]) => <Tab key={displayName} label={displayName} />)}
        </Tabs>
      </Box>
      <Box paddingTop={1} key={purchasedLists[value]?.[0] ?? "inventory"}>
        <PropertyFilter selectedFilters={selectedFilters} onChange={setSelectedFilters} />
        <PurchasedList items={filteredItems} equip={equip} />
      </Box>
    </Box>
  </>;
}

function PurchasedList({ items, equip }: { items: Item[]; equip: (_displayName: string) => void }) {
  const sortedItems = [...items]
    .sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.displayName.localeCompare(b.displayName));

  return <Grid direction="row" container spacing={1}>
    {sortedItems.map((item, index) => (
      <ItemDisplay
        key={`${item.displayName}-${index}`}
        item={item}
        onClick={() => equip(item.displayName)}
      />
    ))}
  </Grid>
}
