import type { SelectChangeEvent } from "@mui/material";
import { Button, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { DIFFICULTIES, getMissionsRequiredForDifficulty } from "../../constants/difficulties";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import { selectMission, setDifficulty, setFaction, setObjective, setPlayerCount, setState } from "../../slices/missionSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectMultiplayer, setConnectionError } from "../../slices/multiplayerSlice";
import { sendLobbyCommand } from "../../multiplayer/api";
import Debrief from "./debrief";
import { calculateFaction, calculateMissionReward, calculateQuestsReward } from "../../economics/mission";
import { getEffectivePlayerCount } from "../../utils/playerCount";
import { Difficulty, LobbyMember, MissionState, Objective, Tier } from "../../types";

export default function Setup() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const missionsRequired = getMissionsRequiredForDifficulty(mission.difficulty);
  const availableObjectives = getObjectives(FACTIONS[mission.faction], mission.difficulty)
    .toSorted((a, b) => sortObjectives(a, b, mission));
  const currentMember = multiplayer.lobbyState?.members.find(
    (member: LobbyMember) => member.memberId === multiplayer.memberId,
  ) ?? null;
  const isHost = currentMember?.isHost ?? false;
  const multiplayerLocked = Boolean(multiplayer.lobbyState) && !isHost;
  const effectivePlayerCount = getEffectivePlayerCount(mission.playerCount, multiplayer.lobbyState);
  const selectedObjective = availableObjectives.some((objective) => objective.displayName === mission.objective)
    ? mission.objective
    : (availableObjectives[0]?.displayName ?? "");

  function handleFaction(event: SelectChangeEvent<number>) {
    dispatch(setFaction({ value: Number(event.target.value) }));
    dispatch(setObjective({ value: '' }));
  }
  function handleDifficulty(event: SelectChangeEvent<number>) {
    dispatch(setDifficulty({ value: Number(event.target.value) }));
  }
  function handleObjective(event: SelectChangeEvent<string>) {
    dispatch(setObjective({ value: event.target.value }));
  }
  function handlePlayerCount(event: SelectChangeEvent<string>) {
    dispatch(setPlayerCount({ value: Number(event.target.value) }));
  }
  async function handleLockIn() {
    if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken && isHost) {
      try {
        await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
          type: "setMissionConfig",
          mission: {
            faction: mission.faction,
            difficulty: mission.difficulty,
            objective: selectedObjective,
          },
        });
        await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
          type: "lockMissionConfig",
        });
      } catch (error) {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to lock mission"));
      }
      return;
    }

    if (mission.objective !== selectedObjective) {
      dispatch(setObjective({ value: selectedObjective }));
    }
    dispatch(setState({ value: 'generating' }));
  }
  function handleDebrief() {
    dispatch(setState({ value: 'debrief' }));
  }

  const briefState = mission.state === 'brief';
  const loadoutState = mission.state === 'loadout';
  const debriefState = mission.state === 'debrief';

  const missionReward = calculateMissionReward({ ...mission, stars: 5, playerCount: effectivePlayerCount });
  const questsReward = !briefState && mission.quests ? calculateQuestsReward(mission.quests.map((quest) => ({...quest, completed: true}))) : '??';

  return <Grid direction="column" container spacing={2} sx={{width: '250px'}}>
    <Typography variant="h5">Mission Brief</Typography>
    <FormControl>
      <InputLabel>Faction</InputLabel>
      <Select
        value={mission.faction}
        disabled={!briefState || mission.factionLocked || multiplayerLocked}
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
        disabled={!briefState || mission.factionLocked || multiplayerLocked}
        label="Difficulty"
        onChange={handleDifficulty}
      >
        {DIFFICULTIES.map((difficulty, i) => <MenuItem key={difficulty.displayName} value={i}>{i + 1} - {difficulty.displayName}</MenuItem>).toReversed()}
      </Select>
    </FormControl>
    <FormControl>
      <InputLabel>Objective</InputLabel>
      <Select
        value={selectedObjective}
        disabled={!briefState || multiplayerLocked}
        label="Objective"
        onChange={handleObjective}
      >
        {availableObjectives.map((objective) =>
          <MenuItem key={objective.displayName} value={objective.displayName}>
            {(objective.tier[calculateFaction(mission)] ?? "d").toUpperCase()} - {objective.displayName}
          </MenuItem>)}
      </Select>
    </FormControl>
    {!multiplayer.lobbyState && (
      <FormControl>
        <InputLabel>Players</InputLabel>
        <Select
          value={mission.playerCount.toString()}
          disabled={!briefState}
          label="Players"
          onChange={handlePlayerCount}
        >
          {[1, 2, 3, 4].map((count) => <MenuItem key={count} value={count.toString()}>{count}</MenuItem>)}
        </Select>
      </FormControl>
    )}
    <Typography>
      Operation Mission {mission.mission} of {missionsRequired}
    </Typography>
    <Typography color="success">
      {missionReward}¢ (+ {questsReward}¢) Maximum Reward · {effectivePlayerCount} Player{effectivePlayerCount === 1 ? "" : "s"}
    </Typography>
    <Button variant="outlined" onClick={() => void handleLockIn()} disabled={!briefState || multiplayerLocked}>Lock In</Button>
    <Button variant="outlined" onClick={handleDebrief} disabled={!loadoutState || multiplayerLocked}>Deploy</Button>
    {debriefState && <Debrief />}
  </Grid>;
}

const TIER_ORDER: Tier[] = ["s", "a", "b", "c", "d"];

function sortObjectives(a: Objective, b: Objective, mission: MissionState) {
  const aTier = (a.tier[FACTIONS[mission.faction]] || 'd');
  const bTier = (b.tier[FACTIONS[mission.faction]] || 'd');
  return TIER_ORDER.indexOf(aTier) - TIER_ORDER.indexOf(bTier) || a.displayName.localeCompare(b.displayName);
}
