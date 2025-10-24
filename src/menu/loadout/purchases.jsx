import { Box, Grid, Tab, Tabs, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addPurchased, selectPurchased, subtractPurchased } from "../../slices/purchasedSlice";
import { getConstant } from "../../constants";
import ItemDisplay from "../../itemDisplay";
import { getEquipmentSlot, selectEquipment, setSlot, setStratagem, unsetEquipment } from "../../slices/equipmentSlice";
import { useState } from "react";

export default function Purchases() {
  const equipment = useSelector(selectEquipment);
  const { purchased: purchased_ } = useSelector(selectPurchased);
  const purchased = purchased_.map(getConstant);

  const [value, setValue] = useState(0);

  function handleChange(_event, newValue) {
    setValue(newValue);
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
  } = Object.groupBy(purchased, (item) => item.category);
  const stratagem = [...Supply, ...Eagle, ...Defense, ...Orbital];

  const purchasedLists = [
    ["Armor Passives", armor],
    ["Boosters", booster],
    ["Primaries", primary],
    ["Secondaries", secondary],
    ["Throwables", throwable],
    ["Stratagems", stratagem],
  ];
  const [, items] = purchasedLists[value];

  const dispatch = useDispatch();

  function equip(displayName) {
    const item = getConstant(displayName);
    const slot = getEquipmentSlot(item);
    const firstEmptyStratagem = equipment.stratagems.indexOf(null);

    if (slot !== 'stratagems') {
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
        <PurchasedList index={value} items={items} equip={equip} />
      </Box>
    </Box>
  </>;
}

function PurchasedList({ items, equip }) {
  items.sort((a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName));

  return <Grid direction="row" container spacing={1}>
    {items.map(item => <ItemDisplay item={item} onClick={() => equip(item.displayName)} />)}
  </Grid>
}
