import { Divider, Grid } from "@mui/material";
import Inventory from "./inventory";
import OnSale from "./onSale";
import { useDispatch, useSelector } from "react-redux";
import { resetShop, selectShop } from "../../slices/shopSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { useEffect } from "react";
import { selectMission } from "../../slices/missionSlice";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { getEffectivePlayerCount } from "../../utils/playerCount";
import CartManager from "./cart";

export default function Shop() {
  const dispatch = useDispatch();
  const shop = useSelector(selectShop);
  const { overrides } = useSelector(selectTierList);
  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const playerCount = getEffectivePlayerCount(mission.playerCount, multiplayer.lobbyState);

  useEffect(() => {
    if (!shop.initialised || shop.playerCount !== playerCount) {
      dispatch(resetShop({ missionCount: null, playerCount, tierOverrides: overrides }));
    }
  }, [dispatch, overrides, playerCount, shop.initialised, shop.playerCount]);

  return <Grid direction="column" spacing={2} container>
    <OnSale />
    <Divider />
    <Inventory />
    <CartManager />
  </Grid>;
}
