import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectEquipment, unsetEquipment } from "../../slices/equipmentSlice";
import ItemDisplay, { MissingArmor, MissingBooster, MissingPrimary, MissingSecondary, MissingStratagem, MissingThrowable } from "../../itemDisplay";
import { Box, Divider, Grid, Typography } from "@mui/material";
import { getConstant } from "../../constants";
import { addPurchased } from "../../slices/purchasedSlice";
import { itemCost } from "../../economics/shop";
import type { Item } from "../../types";

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
  const equippedItems = [
    armorPassive && getConstant(armorPassive),
    booster && getConstant(booster),
    primary && getConstant(primary),
    secondary && getConstant(secondary),
    throwable && getConstant(throwable),
    ...stratagems.map((stratagem) => stratagem && getConstant(stratagem)),
  ].filter((item): item is Item => Boolean(item));
  const equippedCost = useMemo(() => {
    const pricedItems = equippedItems.map(itemCost);
    return pricedItems.reduce((sum, item) => sum + item, 0);
  }, [equippedItems]);

  function unequip(displayName: string) {
    dispatch(unsetEquipment({ value: displayName }));
    dispatch(addPurchased({ value: displayName }));
  }

  return <>
    <Box sx={{ alignItems: "baseline", display: "flex", gap: 1 }}>
      <Typography variant="h5">Equipment</Typography>
      <Typography color="text.secondary" variant="subtitle1">{Math.floor(equippedCost / 2)} ~ {equippedCost}¢</Typography>
    </Box>
    <Grid direction="column" container spacing={1}>
      <Grid direction="row" container spacing={1}>
        {armorPassive ? <ItemDisplay item={getConstant(armorPassive)!} onClick={() => unequip(armorPassive)} /> : <MissingArmor />}
        {booster ? <ItemDisplay item={getConstant(booster)!} onClick={() => unequip(booster)} /> : <MissingBooster />}
        <Divider orientation="vertical" variant="middle" flexItem />
        {primary ? <ItemDisplay item={getConstant(primary)!} onClick={() => unequip(primary)} /> : <MissingPrimary />}
        {secondary ? <ItemDisplay item={getConstant(secondary)!} onClick={() => unequip(secondary)} /> : <MissingSecondary />}
        {throwable ? <ItemDisplay item={getConstant(throwable)!} onClick={() => unequip(throwable)} /> : <MissingThrowable />}
        <Divider orientation="vertical" variant="middle" flexItem />
        {stratagems.map(stratagem => stratagem ? <ItemDisplay key={stratagem} item={getConstant(stratagem)!} onClick={() => unequip(stratagem)} /> : <MissingStratagem />)}
      </Grid>
    </Grid>
  </>;
}
