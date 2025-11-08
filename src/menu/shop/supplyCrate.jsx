import { Badge, Grid } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { useDispatch, useSelector } from "react-redux";
import { buySupplyCrate, selectShop } from "../../slices/shopSlice";
import { selectCredits, subtractCredits } from "../../slices/creditsSlice";
import { addPurchased } from "../../slices/purchasedSlice";
import { chooseSupplyCrateContents } from "../../economics/shop";
import { setSnackbar } from "../../slices/snackbarSlice";

export default function SupplyCrates() {
  const { supplyCrates } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  function buy(item) {
    if (credits >= item.cost) {
      const contents = chooseSupplyCrateContents(item);
      dispatch(buySupplyCrate({ value: item, contents }));
      dispatch(subtractCredits({ amount: item.cost }));
      dispatch(addPurchased({ value: contents.displayName }));
      dispatch(setSnackbar({ message: `Purchased ${contents.displayName}` }));
    }
  }

  const list = [...supplyCrates].sort((a, b) => b.cost - a.cost);

  return <>
    <Grid direction="row" container spacing={1}>
      {list.map(item => {
        const isAffordable = credits >= item.cost;
        const inner = <ItemDisplay item={item} onClick={buy} isAffordable={isAffordable && !item.purchased} />
        if (!item.purchased) {
          return <Badge badgeContent={item.cost} color={isAffordable ? "success" : "error"}>
            {inner}
          </Badge>;
        } else {
          return <>
            {inner}
          </>;
        }
      })}
    </Grid>
  </>;
}
