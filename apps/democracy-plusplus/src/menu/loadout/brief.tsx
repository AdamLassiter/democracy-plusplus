import { Divider, Grid, Typography } from "@mui/material";
import { useEffect } from "react";
import { selectMission, setQuests, setRestrictions, setPrng, setState } from "../../slices/missionSlice";
import { PRNG } from "../../economics/lfsr";
import { calculateQuests, calculateRestrictions } from "../../economics/mission";
import { useDispatch, useSelector } from "react-redux";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import Setup from "./setup";
import Quests from "./quests";
import Restrictions from "./restrictions";
import { logMissionDebug, useMissionDebugEffect, useMissionDebugRender } from "../../utils/missionDebug";
import type { LobbyMember } from "../../types";
import { canGenerateMission } from "../../multiplayer/missionSync";
import { prepareChallengeRound, selectEffectiveChallengeMode } from "../../slices/challengesSlice";

export default function Brief() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const multiplayer = useSelector(selectMultiplayer);
  const challengeMode = useSelector(selectEffectiveChallengeMode);
  const currentMember = multiplayer.lobbyState?.members.find(
    (member: LobbyMember) => member.memberId === multiplayer.memberId,
  ) ?? null;
  const isHost = currentMember?.isHost ?? false;
  const canGenerateLocally = canGenerateMission(Boolean(multiplayer.lobbyState), isHost);

  const generatingState = mission.state === 'generating';

  useMissionDebugRender("Brief", {
    missionState: mission.state,
    prng: mission.prng,
    quests: mission.quests.length,
    restrictions: mission.restrictions.length,
    generatingState,
    canGenerateLocally,
  });
  useMissionDebugEffect("Brief generation gate", {
    missionState: mission.state,
    prng: mission.prng,
    quests: mission.quests,
    restrictions: mission.restrictions,
    canGenerateLocally,
  });

  useEffect(() => {
    // In multiplayer, only the host generates the shared mission payload.
    if (generatingState && challengeMode !== "budget") {
      dispatch(prepareChallengeRound(challengeMode));
      dispatch(setQuests({ value: [] }));
      dispatch(setRestrictions({ value: [] }));
      dispatch(setState({ value: 'loadout' }));
      return;
    }
    if (generatingState && canGenerateLocally) {
      logMissionDebug("Brief generating start", {
        prng: mission.prng,
        questCount: mission.quests.length,
        restrictionCount: mission.restrictions.length,
      });
      const prng = new PRNG(mission.prng);
      const quests = calculateQuests(mission, prng, mission.quests);
      const restrictions = calculateRestrictions(mission, quests, prng, mission.restrictions);

      logMissionDebug("Brief generating result", {
        nextQuestCount: quests.length,
        nextRestrictionCount: restrictions.length,
        nextPrng: mission.prng + 1,
      });
      dispatch(setQuests({ value: quests }));
      dispatch(setRestrictions({ value: restrictions }));
      dispatch(setPrng({ value: mission.prng + 1 }));
      dispatch(setState({ value: 'loadout' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerateLocally, challengeMode, mission.state]);

  return <>
    <Grid direction={{ xs: "column", md: "row" }} container spacing={2}>
      <Setup />
      {generatingState && challengeMode === "budget" && !canGenerateLocally && (
        <Typography color="text.secondary" sx={{ alignSelf: "center", paddingLeft: 2 }}>
          Host is generating the mission briefing...
        </Typography>
      )}
      {!!mission.quests.length && <>
        <ResponsiveDivider />
        <Quests />
      </>}
      {!!mission.restrictions.length && <>
        <ResponsiveDivider />
        <Restrictions />
      </>}
    </Grid>
  </>;
}

function ResponsiveDivider() {
  return <>
    <Divider sx={{ display: { xs: "block", md: "none" } }} flexItem />
    <Divider sx={{ display: { xs: "none", md: "block" } }} orientation="vertical" variant="middle" flexItem />
  </>;
}
