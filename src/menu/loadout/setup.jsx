import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import { selectMission, setFaction, setObjective, setState } from "../../slices/missionSlice";
import { useDispatch, useSelector } from "react-redux";

export default function Setup() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);

  const handleFaction = (event) => {
    dispatch(setFaction(event.target.value));
    dispatch(setObjective(0));
  };
  const handleObjective = (event) => {
    dispatch(setObjective(event.target.value));
  };
  const handleLockIn = () => {
    dispatch(setState({ value: 'generating' }));
  };

  const locked = mission.state !== 'brief';

  return <Grid direction="column" container spacing={1}>
    <Typography variant="h5">Mission Brief</Typography>
    <FormControl sx={{ width: '250px' }}>
      <InputLabel>Faction</InputLabel>
      <Select
        value={mission.faction}
        disabled={locked}
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
        disabled={locked}
        label="Objective"
        onChange={handleObjective}
      >
        {getObjectives(FACTIONS[mission.faction]).map(((objective, i) => <MenuItem value={i}>{objective}</MenuItem>))}
      </Select>
    </FormControl>
    <Button variant="outlined" onClick={handleLockIn} disabled={locked}>Lock In</Button>
  </Grid>;
}
