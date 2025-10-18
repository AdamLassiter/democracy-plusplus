import { Divider, Grid } from "@mui/material";
import Inventory from "./inventory";
import OnSale from "./onSale";
import { useDispatch, useSelector } from "react-redux";
import { resetShop, selectShop } from "../../slices/shopSlice";
import { useEffect } from "react";

export default function Shop() {
  const dispatch = useDispatch();
  const shop = useSelector(selectShop);

  useEffect(() => {
    if (!shop.initialised) {
      dispatch(resetShop());
    }
  }, [dispatch, shop.initialised]);

  return <Grid direction="column" spacing={2} container>
    <OnSale />
    <Divider />
    <Inventory />
  </Grid>;
}
