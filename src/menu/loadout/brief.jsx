import { Divider, Grid } from "@mui/material";
import { useEffect } from "react";
import { selectMission, setQuests, setRestrictions, setPrng, setState } from "../../slices/missionSlice";
import { PRNG } from "../../economics/lfsr";
import { calculateQuests, calculateRestrictions } from "../../economics/mission";
import { useDispatch, useSelector } from "react-redux";
import Setup from "./setup";
import Quests from "./quests";
import Restrictions from "./restrictions";

export default function Brief() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);

  const generatingState = mission.state === 'generating';

  useEffect(() => {
    if (generatingState) {
      const prng = new PRNG(mission.prng);
      const quests = calculateQuests(mission, prng, mission.quests);
      const restrictions = calculateRestrictions(mission, quests, prng, mission.restrictions);

      dispatch(setQuests({ value: quests }));
      dispatch(setRestrictions({ value: restrictions }));
      dispatch(setPrng({ value: prng.rand(65536) }));
      dispatch(setState({ value: 'loadout' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.state]);

  return <>
    <Grid direction="row" container spacing={2}>
      <Setup />
      {!!mission.quests.length && <>
        <Divider orientation="vertical" variant="middle" flexItem />
        <Quests />
      </>}
      {!!mission.restrictions.length && <>
        <Divider orientation="vertical" variant="middle" flexItem />
        <Restrictions />
      </>}
    </Grid>
  </>;
}
