import type { SelectChangeEvent } from "@mui/material";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { DIFFICULTIES, getMissionsRequiredForDifficulty } from "../../constants/difficulties";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import { selectMission, setDifficulty, setFaction, setObjective, setState } from "../../slices/missionSlice";
import { useDispatch, useSelector } from "react-redux";
import Debrief from "./debrief";
import { calculateFaction, calculateMissionReward, calculateQuestsReward } from "../../economics/mission";
import { MissionState, Objective, Tier } from "../../types";

export default function Setup() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const missionsRequired = getMissionsRequiredForDifficulty(mission.difficulty);
  const availableObjectives = getObjectives(FACTIONS[mission.faction], mission.difficulty);

  function handleFaction(event: SelectChangeEvent<number>) {
    dispatch(setFaction({ value: Number(event.target.value) }));
    dispatch(setObjective({ value: 0 }));
  }
  function handleDifficulty(event: SelectChangeEvent<number>) {
    dispatch(setDifficulty({ value: Number(event.target.value) }));
  }
  function handleObjective(event: SelectChangeEvent<number>) {
    dispatch(setObjective({ value: Number(event.target.value) }));
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

  const missionReward = calculateMissionReward({ ...mission, stars: 5 });
  const questsReward = !briefState && mission.quests ? calculateQuestsReward(mission.quests.map((quest) => ({...quest, completed: true}))) : '??';

  return <Grid direction="column" container spacing={2} sx={{width: '250px'}}>
    <Typography variant="h5">Mission Brief</Typography>
    <FormControl>
      <InputLabel>Faction</InputLabel>
      <Select
        value={mission.faction}
        disabled={!briefState || mission.factionLocked}
        label="Faction"
        onChange={handleFaction}
      >
        {FACTIONS.map((faction, i) => <MenuItem key={faction} value={i}>{faction}</MenuItem>)}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel>Difficulty</InputLabel>
      <Select
        value={mission.difficulty}
        disabled={!briefState || mission.factionLocked}
        label="Difficulty"
        onChange={handleDifficulty}
      >
        {DIFFICULTIES.map((difficulty, i) => <MenuItem key={difficulty.displayName} value={i}>{i + 1} - {difficulty.displayName}</MenuItem>).toReversed()}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel>Objective</InputLabel>
      <Select
        value={availableObjectives[mission.objective] ? mission.objective : 0}
        disabled={!briefState}
        label="Objective"
        onChange={handleObjective}
      >
        {availableObjectives.toSorted((a, b) => sortObjectives(a, b, mission)).map((objective, i) =>
          <MenuItem key={objective.displayName} value={i}>
            {(objective.tier[calculateFaction(mission)] ?? "d").toUpperCase()} - {objective.displayName}
          </MenuItem>)}
      </Select>
    </FormControl>
    <Typography>
      Mission {mission.mission} of {missionsRequired}
    </Typography>
    <Typography color="success">
      {missionReward}¢ (+ {questsReward}¢) Maximum Reward
    </Typography>
    <Button variant="outlined" onClick={handleLockIn} disabled={!briefState}>Lock In</Button>
    <Button variant="outlined" onClick={handleDebrief} disabled={!loadoutState}>Debrief</Button>
    {debriefState && <Debrief />}
  </Grid>;
}

const TIER_ORDER: Tier[] = ["s", "a", "b", "c", "d"];

function sortObjectives(a: Objective, b: Objective, mission: MissionState) {
  const aTier = (a.tier[FACTIONS[mission.faction]] || 'd');
  const bTier = (b.tier[FACTIONS[mission.faction]] || 'd');
  return TIER_ORDER.indexOf(aTier) - TIER_ORDER.indexOf(bTier) || a.displayName.localeCompare(b.displayName);
}