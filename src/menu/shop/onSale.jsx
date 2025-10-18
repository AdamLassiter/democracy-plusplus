import { Badge, Grid, Typography } from "@mui/material";
import DisplayItem from "../item";
import { useDispatch, useSelector } from "react-redux";
import { buyOnSale, selectShop } from "../../slices/shopSlice";
import { selectCredits, subtractCredits } from "../../slices/creditsSlice";
import { addPurchased } from "../../slices/purchasedSlice";

export default function OnSale() {
  const { onSale } = useSelector(selectShop);
  const { credits } = useSelector(selectCredits);
  const dispatch = useDispatch();

  const buy = (item) => {
    if (credits >= item.cost) {
      dispatch(buyOnSale({ value: item }));
      dispatch(subtractCredits({ amount: item.cost }));
      dispatch(addPurchased({ value: item.displayName }));
    }
  };

  const list = [...onSale].sort((a, b) => b.cost - a.cost);

  return <>
    <Typography variant="h5">On Sale</Typography>
    <Grid direction="row" container spacing={1}>
      {list.map(item => {
        return <Badge badgeContent={item.cost} color="success">
          <DisplayItem item={item} onClick={buy} />
        </Badge>;
      })}
    </Grid>
  </>;
}
