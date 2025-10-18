import { Divider, Grid } from "@mui/material";
import MissionBrief from "./missionBrief";
import Purchases from "./purchases";
import Equipped from "./equipped";

export default function Loadout() {
  return <Grid direction="column" spacing={2} container>
    <MissionBrief />
    <Divider />
    <Equipped />
    <Divider />
    <Purchases />
  </Grid>;
}
