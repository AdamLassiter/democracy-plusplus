import { Badge, Grid } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, selectShop } from "../../slices/shopSlice";
import { selectCredits } from "../../slices/creditsSlice";
import { setSnackbar } from "../../slices/snackbarSlice";

export default function SupplyCrates() {
  const { supplyCrates } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  function addItemToCart(item) {
    if (credits >= item.cost) {
      dispatch(addToCart({ value: item }));
      dispatch(setSnackbar({ message: `${item.displayName} added to cart` }));
    } else {
      dispatch(setSnackbar({ message: `Not enough credits for ${item.displayName}`, severity: 'warning' }));
    }
  }

  const list = [...supplyCrates].sort((a, b) => b.cost - a.cost);

  return <>
    <Grid direction="row" container spacing={1}>
      {list.map(item => {
        const isAffordable = credits >= item.cost;
        const inner = <ItemDisplay item={item} onClick={addItemToCart} isAffordable={isAffordable && !item.purchased} />
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
