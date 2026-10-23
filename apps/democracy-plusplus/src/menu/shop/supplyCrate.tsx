import { Badge, Grid } from "@mui/material";
import ItemDisplay from "../../utils/itemDisplay";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, selectShop } from "../../slices/shopSlice";
import { selectCredits } from "../../slices/creditsSlice";
import { setSnackbar } from "../../slices/snackbarSlice";
import type { CrateItem, Item, ShopItem } from "../../types";

function isPurchasableItem(item: Item): item is ShopItem | CrateItem {
  return typeof item.cost === "number";
}

export default function SupplyCrates() {
  const { supplyCrates } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  function addItemToCart(item: Item) {
    if (isPurchasableItem(item) && (item.stock ?? 1) <= 0) {
      dispatch(
        setSnackbar({
          message: `${item.displayName} is out of stock`,
          severity: "warning",
        }),
      );
    } else if (isPurchasableItem(item) && credits >= item.cost) {
      dispatch(addToCart({ value: item }));
      dispatch(setSnackbar({ message: `${item.displayName} added to cart` }));
    } else {
      dispatch(
        setSnackbar({
          message: `Not enough credits for ${item.displayName}`,
          severity: "warning",
        }),
      );
    }
  }

  const list = [...supplyCrates].sort((a, b) => b.cost - a.cost);

  return (
    <>
      <Grid direction="row" container spacing={1}>
        {list.map((item) => {
          const isAffordable = credits >= item.cost;
          const isAvailable = (item.stock ?? 1) > 0;
          const inner = (
            <ItemDisplay
              item={item}
              onClick={addItemToCart}
              isAffordable={isAffordable && isAvailable}
            />
          );
          if (isAvailable) {
            return (
              <Badge
                key={item.displayName}
                badgeContent={`${item.cost}¢ ×${item.stock ?? 1}`}
                color={isAffordable ? "success" : "error"}
              >
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
