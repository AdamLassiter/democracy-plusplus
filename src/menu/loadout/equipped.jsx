import { useDispatch, useSelector } from "react-redux";
import { selectEquipment, unsetEquipment } from "../../slices/equipmentSlice";
import ItemDisplay, { MissingArmor, MissingBooster, MissingPrimary, MissingSecondary, MissingStratagem, MissingThrowable } from "../../itemDisplay";
import { Divider, Grid, Typography } from "@mui/material";
import { getConstant } from "../../constants";
import { addPurchased } from "../../slices/purchasedSlice";

export default function Equipped() {
  const {
    stratagems,
    primary,
    secondary,
    throwable,
    armorPassive,
    booster,
  } = useSelector(selectEquipment);

  const dispatch = useDispatch();

  function unequip(displayName) {
    dispatch(unsetEquipment({ value: displayName }));
    dispatch(addPurchased({ value: displayName }));
  }

  return <>
    <Typography variant="h5">Equipment</Typography>
    <Grid direction="column" container spacing={1}>
      <Grid direction="row" container spacing={1}>
        {primary ? <ItemDisplay item={getConstant(primary)} onClick={() => unequip(primary)} /> : <MissingPrimary />}
        {secondary ? <ItemDisplay item={getConstant(secondary)} onClick={() => unequip(secondary)} /> : <MissingSecondary />}
        {throwable ? <ItemDisplay item={getConstant(throwable)} onClick={() => unequip(throwable)} /> : <MissingThrowable />}
        <Divider orientation="vertical" variant="middle" flexItem />
        {armorPassive ? <ItemDisplay item={getConstant(armorPassive)} onClick={() => unequip(armorPassive)} /> : <MissingArmor />}
        {booster ? <ItemDisplay item={getConstant(booster)} onClick={() => unequip(booster)} /> : <MissingBooster />}
        <Divider orientation="vertical" variant="middle" flexItem />
        {stratagems.map(stratagem => stratagem ? <ItemDisplay item={getConstant(stratagem)} onClick={() => unequip(stratagem)} /> : <MissingStratagem />)}
      </Grid>
    </Grid>
  </>;
}
