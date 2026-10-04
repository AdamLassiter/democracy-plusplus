import type { SelectChangeEvent } from "@mui/material";
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import {
  DIFFICULTIES,
  getMissionsRequiredForDifficulty,
} from "../../constants/difficulties";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import {
  selectMission,
  setDifficulty,
  setFaction,
  setObjective,
  setPlayerCount,
  setQuests,
  setRestrictions,
  setState,
} from "../../slices/missionSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  selectMultiplayer,
  setConnectionError,
} from "../../slices/multiplayerSlice";
import { sendLobbyCommand } from "../../multiplayer/api";
import Debrief from "./debrief";
import {
  calculateFaction,
  calculateMissionReward,
  calculateQuestsReward,
} from "../../economics/mission";
import { getEffectivePlayerCount } from "../../utils/playerCount";
import type {
  ChallengeModeId,
  LobbyMember,
  MissionState,
  Objective,
  Tier,
} from "../../types";
import {
  logMissionDebug,
  useMissionDebugEffect,
  useMissionDebugRender,
} from "../../utils/missionDebug";
import { CHALLENGE_DEFINITIONS } from "../../challenges/engine";
import {
  selectCanDeployChallenge,
  selectChallenges,
  selectEffectiveChallengeMode,
  setPreferredChallengeMode,
} from "../../slices/challengesSlice";
import ChallengeDebrief from "./challengeDebrief";
import SectionHeading from "../../utils/sectionHeading";

export default function Setup() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const challenges = useSelector(selectChallenges);
  const challengeMode = useSelector(selectEffectiveChallengeMode);
  const canDeployChallenge = useSelector(selectCanDeployChallenge);
  const challengeDefinition = CHALLENGE_DEFINITIONS[challengeMode];
  const missionsRequired = getMissionsRequiredForDifficulty(mission.difficulty);
  const availableObjectives = getObjectives(
    FACTIONS[mission.faction],
    mission.difficulty,
  ).toSorted((a, b) => sortObjectives(a, b, mission));
  const currentMember =
    multiplayer.lobbyState?.members.find(
      (member: LobbyMember) => member.memberId === multiplayer.memberId,
    ) ?? null;
  const isHost = currentMember?.isHost ?? false;
  const multiplayerLocked = Boolean(multiplayer.lobbyState) && !isHost;
  const effectivePlayerCount = getEffectivePlayerCount(
    mission.playerCount,
    multiplayer.lobbyState,
  );
  const selectedObjective = availableObjectives.some(
    (objective) => objective.displayName === mission.objective,
  )
    ? mission.objective
    : (availableObjectives[0]?.displayName ?? "");

  useMissionDebugRender("Setup", {
    missionState: mission.state,
    faction: mission.faction,
    difficulty: mission.difficulty,
    objective: mission.objective,
    selectedObjective,
    availableObjectives: availableObjectives.length,
    playerCount: mission.playerCount,
    factionLocked: mission.factionLocked,
    multiplayerLocked,
  });
  useMissionDebugEffect("Setup mission inputs", {
    missionState: mission.state,
    faction: mission.faction,
    difficulty: mission.difficulty,
    objective: mission.objective,
    selectedObjective,
    availableObjectives: availableObjectives.map(
      (objective) => objective.displayName,
    ),
    playerCount: mission.playerCount,
    factionLocked: mission.factionLocked,
    multiplayerLocked,
  });

  function handleFaction(event: SelectChangeEvent<number>) {
    dispatch(setFaction({ value: Number(event.target.value) }));
    dispatch(setObjective({ value: "" }));
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
  async function handleChallengeMode(
    event: SelectChangeEvent<ChallengeModeId>,
  ) {
    const modeId = event.target.value as ChallengeModeId;
    dispatch(setQuests({ value: [] }));
    dispatch(setRestrictions({ value: [] }));
    if (
      multiplayer.lobbyCode &&
      multiplayer.memberId &&
      multiplayer.sessionToken &&
      isHost
    ) {
      try {
        await sendLobbyCommand(
          multiplayer.lobbyCode,
          multiplayer.memberId,
          multiplayer.sessionToken,
          {
            type: "setChallengeSelection",
            challengeSelection: { version: 1, modeId },
          },
        );
      } catch (error) {
        dispatch(
          setConnectionError(
            error instanceof Error
              ? error.message
              : "Failed to change challenge mode",
          ),
        );
      }
    } else if (!multiplayer.lobbyState) {
      dispatch(setPreferredChallengeMode(modeId));
    }
  }
  async function handleLockIn() {
    logMissionDebug("Setup.handleLockIn", {
      missionState: mission.state,
      objective: mission.objective,
      selectedObjective,
      multiplayerLobbyCode: multiplayer.lobbyCode,
      isHost,
    });

    if (mission.objective !== selectedObjective) {
      logMissionDebug("Setup.handleLockIn dispatch setObjective", {
        from: mission.objective,
        to: selectedObjective,
      });
      dispatch(setObjective({ value: selectedObjective }));
    }
    logMissionDebug("Setup.handleLockIn dispatch setState", {
      from: mission.state,
      to: "generating",
    });
    dispatch(setState({ value: "generating" }));

    if (
      multiplayer.lobbyCode &&
      multiplayer.memberId &&
      multiplayer.sessionToken &&
      isHost
    ) {
      try {
        await sendLobbyCommand(
          multiplayer.lobbyCode,
          multiplayer.memberId,
          multiplayer.sessionToken,
          {
            type: "setMissionConfig",
            mission: {
              faction: mission.faction,
              difficulty: mission.difficulty,
              objective: selectedObjective,
            },
          },
        );
        await sendLobbyCommand(
          multiplayer.lobbyCode,
          multiplayer.memberId,
          multiplayer.sessionToken,
          {
            type: "lockMissionConfig",
          },
        );
      } catch (error) {
        dispatch(
          setConnectionError(
            error instanceof Error ? error.message : "Failed to lock mission",
          ),
        );
      }
      return;
    }
  }
  function handleDebrief() {
    dispatch(setState({ value: "debrief" }));
  }

  const briefState = mission.state === "brief";
  const loadoutState = mission.state === "loadout";
  const debriefState = mission.state === "debrief";
  const warbondModeUnavailable =
    challengeMode === "warbond-knockout" &&
    !challenges.ownedWarbondCodes.some((code) => code !== "none");

  const missionReward = calculateMissionReward({
    ...mission,
    stars: 5,
    playerCount: effectivePlayerCount,
  });
  const questsReward =
    !briefState && mission.quests
      ? calculateQuestsReward(
          mission.quests.map((quest) => ({ ...quest, completed: true })),
        )
      : "??";

  return (
    <Grid
      direction="column"
      container
      spacing={2}
      sx={{ width: { xs: "100%", md: 250 } }}
    >
      <SectionHeading
        subtitle="Set the operation, challenge and deployment conditions before requisitioning your loadout."
        title="Mission Brief"
      />
      <FormControl>
        <InputLabel>Challenge Mode</InputLabel>
        <Select
          value={challengeMode}
          disabled={!briefState || multiplayerLocked}
          label="Challenge Mode"
          onChange={handleChallengeMode}
        >
          {Object.values(CHALLENGE_DEFINITIONS).map((definition) => (
            <MenuItem key={definition.id} value={definition.id}>
              {definition.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography color="text.secondary" variant="body2">
        {challengeDefinition.shortDescription}
      </Typography>
      <FormControl>
        <InputLabel>Faction</InputLabel>
        <Select
          value={mission.faction}
          disabled={!briefState || mission.factionLocked || multiplayerLocked}
          label="Faction"
          onChange={handleFaction}
        >
          {FACTIONS.map((faction, i) => (
            <MenuItem key={faction} value={i}>
              {faction}
            </MenuItem>
          ))}
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
          {DIFFICULTIES.map((difficulty, i) => (
            <MenuItem key={difficulty.displayName} value={i}>
              {i + 1} - {difficulty.displayName}
            </MenuItem>
          )).toReversed()}
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
          {availableObjectives.map((objective) => (
            <MenuItem key={objective.displayName} value={objective.displayName}>
              {(objective.tier[calculateFaction(mission)] ?? "d").toUpperCase()}{" "}
              - {objective.displayName}
            </MenuItem>
          ))}
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
            {[1, 2, 3, 4].map((count) => (
              <MenuItem key={count} value={count.toString()}>
                {count}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {challengeDefinition.economy && (
        <Typography>
          Operation Mission {mission.mission} of {missionsRequired}
        </Typography>
      )}
      {challengeDefinition.economy && (
        <Typography color="success">
          {missionReward}¢ (+ {questsReward}¢) Maximum Reward ·{" "}
          {effectivePlayerCount} Player{effectivePlayerCount === 1 ? "" : "s"}
        </Typography>
      )}
      {warbondModeUnavailable && (
        <Typography color="warning.main" variant="body2">
          Select at least one non-Basic warbond.
        </Typography>
      )}
      <Button
        variant="outlined"
        onClick={() => void handleLockIn()}
        disabled={!briefState || multiplayerLocked || warbondModeUnavailable}
      >
        Lock In
      </Button>
      <Button
        variant="outlined"
        onClick={handleDebrief}
        disabled={!loadoutState || multiplayerLocked || !canDeployChallenge}
      >
        Deploy
      </Button>
      {loadoutState &&
        challengeMode === "all-item-knockout" &&
        !canDeployChallenge && (
          <Typography color="warning.main" variant="body2">
            Equip at least one remaining item before deploying.
          </Typography>
        )}
      {debriefState &&
        (challengeDefinition.economy ? <Debrief /> : <ChallengeDebrief />)}
    </Grid>
  );
}

const TIER_ORDER: Tier[] = ["s", "a", "b", "c", "d"];

function sortObjectives(a: Objective, b: Objective, mission: MissionState) {
  const aTier = a.tier[FACTIONS[mission.faction]] || "d";
  const bTier = b.tier[FACTIONS[mission.faction]] || "d";
  return (
    TIER_ORDER.indexOf(aTier) - TIER_ORDER.indexOf(bTier) ||
    a.displayName.localeCompare(b.displayName)
  );
}
