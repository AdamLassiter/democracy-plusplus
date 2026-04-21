import { Divider, Grid } from "@mui/material";
import Brief from "./brief";
import Purchases from "./purchases";
import Equipped from "./equipped";
import LobbyPanel from "./lobbyPanel";

export default function Loadout() {
  return <Grid container spacing={2}>
    <Grid direction="column" spacing={2} container sx={{ flex: 1, minWidth: 0 }}>
      <Brief />
      <Divider />
      <Equipped />
      <Divider />
      <Purchases />
    </Grid>
    <Grid>
      <LobbyPanel />
    </Grid>
  </Grid>;
}
