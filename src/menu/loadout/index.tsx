import { Divider, Grid } from "@mui/material";
import Brief from "./brief";
import Purchases from "./purchases";
import Equipped from "./equipped";

export default function Loadout() {
  return <Grid direction="column" spacing={2} container>
    <Brief />
    <Divider />
    <Equipped />
    <Divider />
    <Purchases />
  </Grid>;
}
