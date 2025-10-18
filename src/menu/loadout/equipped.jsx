import { useDispatch, useSelector } from "react-redux";
import { selectEquipment, unsetEquipment } from "../../slices/equipmentSlice";
import DisplayItem, { MissingArmor, MissingBooster, MissingPrimary, MissingSecondary, MissingStratagem, MissingThrowable } from "../item";
import { Grid, Typography } from "@mui/material";
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
  const unequip = (displayName) => {
    dispatch(unsetEquipment({ value: displayName }));
    dispatch(addPurchased({ value: displayName }));
  };

  return <>
    <Typography variant="h5">Equipment</Typography>
    <Grid direction="column" container spacing={1}>
      <Grid direction="row" container spacing={1}>
        {primary ? <DisplayItem item={getConstant(primary)} onClick={() => unequip(primary)} /> : <MissingPrimary />}
        {secondary ? <DisplayItem item={getConstant(secondary)} onClick={() => unequip(secondary)} /> : <MissingSecondary />}
        {throwable ? <DisplayItem item={getConstant(throwable)} onClick={() => unequip(throwable)} /> : <MissingThrowable />}
        {armorPassive ? <DisplayItem item={getConstant(armorPassive)} onClick={() => unequip(armorPassive)} /> : <MissingArmor />}
        {booster ? <DisplayItem item={getConstant(booster)} onClick={() => unequip(booster)} /> : <MissingBooster />}
      </Grid>
      <Grid direction="row" container spacing={1}>
        {stratagems.map(stratagem => stratagem ? <DisplayItem item={getConstant(stratagem)} onClick={() => unequip(stratagem)} /> : <MissingStratagem />)}
      </Grid>
    </Grid>
  </>;
}
