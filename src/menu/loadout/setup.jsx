import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import { selectMission, setFaction, setObjective, setState } from "../../slices/missionSlice";
import { useDispatch, useSelector } from "react-redux";
import Debrief from "./debrief";
import { calculateFaction, calculateMissionReward } from "../../economics/mission";

export default function Setup() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);

  function handleFaction(event) {
    dispatch(setFaction({ value: event.target.value }));
    dispatch(setObjective({ value: 0 }));
  }
  function handleObjective(event) {
    dispatch(setObjective({ value: event.target.value }));
  }
  function handleLockIn() {
    dispatch(setState({ value: 'generating' }));
  }
  function handleDebrief() {
    dispatch(setState({ value: 'debrief' }));
  }

  const briefState = mission.state === 'brief';
  const loadoutState = mission.state === 'loadout';
  const debriefState = mission.state === 'debrief';

  return <Grid direction="column" container spacing={2}>
    <Typography variant="h5">Mission Brief</Typography>
    <FormControl sx={{ width: '250px' }}>
      <InputLabel>Faction</InputLabel>
      <Select
        value={mission.faction}
        disabled={!briefState}
        label="Faction"
        onChange={handleFaction}
      >
        {FACTIONS.map(((faction, i) => <MenuItem value={i}>{faction}</MenuItem>))}
      </Select>
    </FormControl>
    <FormControl sx={{ width: '250px' }}>
      <InputLabel>Objective</InputLabel>
      <Select
        value={mission.objective}
        disabled={!briefState}
        label="Objective"
        onChange={handleObjective}
      >
        {getObjectives(FACTIONS[mission.faction]).map(((objective, i) =>
          <MenuItem value={i}>
            {objective.tier[calculateFaction(mission)].toUpperCase()} - {objective.displayName}
          </MenuItem>))}
      </Select>
    </FormControl>
    <Typography color="success">
      {calculateMissionReward({ ...mission, stars: 5 })}¢ Maximum Base Reward
    </Typography>
    <Button variant="outlined" onClick={handleLockIn} disabled={!briefState}>Lock In</Button>
    <Button variant="outlined" onClick={handleDebrief} disabled={!loadoutState}>Debrief</Button>
    {debriefState && <Debrief />}
  </Grid>;
}
