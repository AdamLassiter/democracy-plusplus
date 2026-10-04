import { Divider, Grid } from "@mui/material";
import Brief from "./brief";
import Purchases from "./purchases";
import Equipped from "./equipped";
import { useSelector } from "react-redux";
import { selectEffectiveChallengeMode } from "../../slices/challengesSlice";
import ChallengeEquipment from "./challengeEquipment";

export default function Loadout() {
  const challengeMode = useSelector(selectEffectiveChallengeMode);
  return (
    <Grid container spacing={2}>
      <Grid
        direction="column"
        spacing={2}
        container
        sx={{ flex: 1, minWidth: 0 }}
      >
        <Brief />
        <Divider />
        {challengeMode === "budget" ? (
          <>
            <Equipped />
            <Divider />
            <Purchases />
          </>
        ) : (
          <ChallengeEquipment />
        )}
      </Grid>
    </Grid>
  );
}
