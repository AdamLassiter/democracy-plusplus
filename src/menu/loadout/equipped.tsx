import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectEquipment, unsetEquipment } from "../../slices/equipmentSlice";
import ItemDisplay, { MissingArmor, MissingBooster, MissingPrimary, MissingSecondary, MissingStratagem, MissingThrowable } from "../../utils/itemDisplay";
import { Box, Divider, Grid, Typography } from "@mui/material";
import { getItem } from "../../constants";
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
    armorPassive && getItem(armorPassive),
    booster && getItem(booster),
    primary && getItem(primary),
    secondary && getItem(secondary),
    throwable && getItem(throwable),
    ...stratagems.map((stratagem) => stratagem && getItem(stratagem)),
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
        {primary ? <ItemDisplay key="primary" item={getItem(primary)!} onClick={() => unequip(primary)} /> : <MissingPrimary key="primary-missing" />}
        {secondary ? <ItemDisplay key="secondary" item={getItem(secondary)!} onClick={() => unequip(secondary)} /> : <MissingSecondary key="secondary-missing" />}
        {throwable ? <ItemDisplay key="throwable" item={getItem(throwable)!} onClick={() => unequip(throwable)} /> : <MissingThrowable key="throwable-missing" />}
        {armorPassive ? <ItemDisplay key="armorPassive" item={getItem(armorPassive)!} onClick={() => unequip(armorPassive)} /> : <MissingArmor key="armor-missing" />}
        <Divider orientation="vertical" variant="middle" flexItem />
        {stratagems.map((stratagem, index) => stratagem
          ? <ItemDisplay key={`stratagem-${index}-${stratagem}`} item={getItem(stratagem)!} onClick={() => unequip(stratagem)} />
          : <MissingStratagem key={`stratagem-${index}-missing`} />)}
        {booster ? <ItemDisplay key="booster" item={getItem(booster)!} onClick={() => unequip(booster)} /> : <MissingBooster key="booster-missing" />}
      </Grid>
    </Grid>
  </>;
}
