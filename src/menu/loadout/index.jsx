import { Divider, Grid } from "@mui/material";
import Stats from "./stats";
import Purchased from "./purchased";
import Equipped from "./equipped";

export default function Loadout() {
  return <Grid direction="column" spacing={2} container>
    <Stats />
    <Divider />
    <Equipped />
    <Divider />
    <Purchased />
  </Grid>;
}