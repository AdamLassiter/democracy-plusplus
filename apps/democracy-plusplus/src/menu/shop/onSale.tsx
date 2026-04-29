import { Badge, Grid, Tooltip, Typography } from "@mui/material";
import ItemDisplay from "../../utils/itemDisplay";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, selectShop } from "../../slices/shopSlice";
import { selectCredits } from "../../slices/creditsSlice";
import { setSnackbar } from "../../slices/snackbarSlice";
import type { CrateItem, Item, ShopItem } from "../../types";

function isPurchasableItem(item: Item): item is ShopItem | CrateItem {
  return typeof item.cost === "number";
}

export default function OnSale() {
  const { onSale } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  function addItemToCart(item: Item) {
    if (isPurchasableItem(item) && credits >= item.cost) {
      dispatch(addToCart({ value: item }));
      dispatch(setSnackbar({ message: `${item.displayName} added to cart` }));
    } else {
      dispatch(setSnackbar({ message: `Not enough credits for ${item.displayName}`, severity: 'warning' }));
    }
  }

  const list = [...onSale].sort((a, b) => b.cost - a.cost);

  return (
    <>
      <Tooltip title="Items on sale for 50% off this mission. Randomly restocked each mission, and unique per player.">
        <Typography variant="h5">Discount Surplus</Typography>
      </Tooltip>
      <Grid container spacing={1}>
        {list.map((item) => {
          const isAffordable = credits >= item.cost;
          const inner = (
            <ItemDisplay
              item={item}
              onClick={addItemToCart}
              isAffordable={isAffordable && !item.purchased}
            />
          );
          if (!item.purchased) {
            return (
              <Badge key={item.displayName} badgeContent={item.cost} color={isAffordable ? "success" : "error"}>
                {inner}
              </Badge>
            );
          } else {
            return <span key={item.displayName}>{inner}</span>;
          }
        })}
      </Grid>
    </>
  );
}
