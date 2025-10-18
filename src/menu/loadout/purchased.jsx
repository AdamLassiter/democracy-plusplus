import { Grid, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { addPurchased, selectPurchased, subtractPurchased } from "../../slices/purchasedSlice";
import { getConstant } from "../../constants";
import DisplayItem from "../item";
import { getEquipmentSlot, selectEquipment, setSlot, setStratagem, unsetEquipment } from "../../slices/equipmentSlice";

export default function Purchased() {
  const equipment = useSelector(selectEquipment);
  const { purchased: purchased_ } = useSelector(selectPurchased);
  const purchased = purchased_.map(getConstant);

  const lists = Object.groupBy(purchased, (item) => item.category);

  const dispatch = useDispatch();
  const equip = (displayName) => {
    const item = getConstant(displayName);
    const slot = getEquipmentSlot(item);
    const firstEmptyStratagem = equipment.stratagems.indexOf(null);

    if (slot !== 'stratagems') {
      const equippedItem = equipment[slot];
      if (equippedItem) {
        dispatch(unsetEquipment({ value: displayName }));
        dispatch(addPurchased({ value: displayName }));
      }
      dispatch(setSlot({ slot, value: displayName }));
      dispatch(subtractPurchased({ value: displayName }));
    } else if (firstEmptyStratagem !== -1) {
      dispatch(setStratagem({ slot: firstEmptyStratagem, value: displayName }));
      dispatch(subtractPurchased({ value: displayName }));
    }
  };

  return <>
    <Typography variant="h4">Inventory</Typography>
    <Grid direction="column" container spacing={1}>
      {Object.values(lists).map(list => {
        return <Grid direction="row" container spacing={1}>
          {list.map(item => <DisplayItem item={item} onClick={() => equip(item.displayName)} />)}
        </Grid>
      })}
    </Grid>
  </>;
}
