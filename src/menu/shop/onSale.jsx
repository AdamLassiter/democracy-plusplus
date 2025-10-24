import { Badge, Grid, Typography } from "@mui/material";
import ItemDisplay from "../../itemDisplay";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, selectShop } from "../../slices/shopSlice";
import { selectCredits } from "../../slices/creditsSlice";
import { setSnackbar } from "../../slices/snackbarSlice";

export default function OnSale() {
  const { onSale } = useSelector(selectShop);
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

  const list = [...onSale].sort((a, b) => b.cost - a.cost);

  return (
    <>
      <Typography variant="h5">On Sale</Typography>
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
            return <>{inner}</>;
          }
        })}
      </Grid>
    </>
  );
}
