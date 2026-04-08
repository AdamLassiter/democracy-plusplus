import type { SyntheticEvent } from "react";
import { Box, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addPurchased, selectPurchased, subtractPurchased } from "../../slices/purchasedSlice";
import { getConstant } from "../../constants";
import ItemDisplay from "../../itemDisplay";
import { getEquipmentSlot, selectEquipment, setSlot, setStratagem, unsetEquipment } from "../../slices/equipmentSlice";
import { useState } from "react";
import { chooseSupplyCrateContents } from "../../economics/shop";
import { setSnackbar } from "../../slices/snackbarSlice";
import PropertyFilter from "../../propertyFilter";
import { filterItemsByPropertyValues } from "../../constants/filters";
import type { Item } from "../../types";

export default function Purchases() {
  const equipment = useSelector(selectEquipment);
  const { purchased: purchased_ } = useSelector(selectPurchased);
  const purchased = purchased_.map(getConstant).filter(Boolean) as Item[];

  const [value, setValue] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  function handleChange(_event: SyntheticEvent, newValue: number) {
    setValue(newValue);
  }

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
  } = Object.groupBy(purchased, (item) => item.category);
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const purchasedLists: Array<[string, Item[]]> = [
    ["Armor Passives", armor],
    ["Boosters", booster],
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Stratagems", stratagem],
    ["Supply Crates", crate],
  ];
  const [, items] = purchasedLists[value];
  const filteredItems = filterItemsByPropertyValues(items, selectedFilters);

  const dispatch = useDispatch();

  function equip(displayName: string) {
    const item = getConstant(displayName);
    if (!item) {
      return;
    }
    const slot = getEquipmentSlot(item);
    const firstEmptyStratagem = equipment.stratagems.indexOf(null);

    if (item.category === "crate") {
      const contents = chooseSupplyCrateContents(item);
      dispatch(subtractPurchased({ value: displayName }));
      dispatch(addPurchased({ value: contents.displayName }));
      dispatch(setSnackbar({ message: `Unwrapped ${contents.displayName}!` }));
    } else if (slot !== 'stratagems') {
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
    <Typography variant="h5">Inventory</Typography>
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange}>
          {purchasedLists.map(([displayName]) => <Tab label={displayName} />)}
        </Tabs>
      </Box>
      <Box paddingTop={1}>
        <PropertyFilter selectedFilters={selectedFilters} onChange={setSelectedFilters} />
        <PurchasedList items={filteredItems} equip={equip} />
      </Box>
    </Box>
  </>;
}

function PurchasedList({ items, equip }: { items: Item[]; equip: (displayName: string) => void }) {
  items.sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.displayName.localeCompare(b.displayName));

  return <Grid direction="row" container spacing={1}>
    {items.map(item => <ItemDisplay key={item.displayName} item={item} onClick={() => equip(item.displayName)} />)}
  </Grid>
}
