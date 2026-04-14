import { Divider, Grid } from "@mui/material";
import Inventory from "./inventory";
import OnSale from "./onSale";
import { useDispatch, useSelector } from "react-redux";
import { resetShop, selectShop } from "../../slices/shopSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { useEffect } from "react";
import CartManager from "./cart";

export default function Shop() {
  const dispatch = useDispatch();
  const shop = useSelector(selectShop);
  const { overrides } = useSelector(selectTierList);

  useEffect(() => {
    if (!shop.initialised) {
      dispatch(resetShop({ missionCount: null, tierOverrides: overrides }));
    }
  }, [dispatch, overrides, shop.initialised]);

  return <Grid direction="column" spacing={2} container>
    <OnSale />
    <Divider />
    <Inventory />
    <CartManager />
  </Grid>;
}
