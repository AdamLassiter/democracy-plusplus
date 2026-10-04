import { Box, Button, Dialog, Rating, Typography } from "@mui/material";
import type { SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { equipmentItems } from "../../challenges/engine";
import { unlockedAchievementsForItems } from "../../constants/achievements";
import { FACTIONS } from "../../constants/factions";
import { getObjective } from "../../constants/objectives";
import { getItem } from "../../constants";
import { sendLobbyCommand } from "../../multiplayer/api";
import { countPendingDebriefMembers, shouldApplyDebriefSubmission } from "../../multiplayer/missionSync";
import { unlockAchievements } from "../../slices/achievementsSlice";
import {
  completeChallengeRound,
  selectActiveEquipment,
  selectEffectiveChallengeMode,
} from "../../slices/challengesSlice";
import type { AppDispatch } from "../../slices";
import { addMissionLogEntry } from "../../slices/logSlice";
import { resetMission, selectMission } from "../../slices/missionSlice";
import {
  selectMultiplayer,
  setConnectionError,
  setLastProcessedDebriefSubmissionId,
} from "../../slices/multiplayerSlice";
import type { Item, LobbyMember } from "../../types";
import CloseableDialogTitle from "../../utils/closeableDialogTitle";

export default function ChallengeDebrief() {
  const dispatch = useDispatch<AppDispatch>();
  const mission = useSelector(selectMission);
  const equipment = useSelector(selectActiveEquipment);
  const modeId = useSelector(selectEffectiveChallengeMode);
  const multiplayer = useSelector(selectMultiplayer);
  const currentMember = multiplayer.lobbyState?.members.find(
    (member: LobbyMember) => member.memberId === multiplayer.memberId,
  ) ?? null;
  const isHost = currentMember?.isHost ?? true;
  const hasLobbyState = Boolean(multiplayer.lobbyState);
  const syncedMission = multiplayer.lobbyState?.mission ?? null;
  const [stars, setStars] = useState(syncedMission?.stars ?? 1);
  const [isFinalised, setIsFinalised] = useState(currentMember?.debriefReady ?? false);
  const [open, setOpen] = useState(true);
  const processedSubmissionRef = useRef<number | null>(null);
  const completingSoloRef = useRef(false);
  const pendingMembers = countPendingDebriefMembers(multiplayer.lobbyState?.members);

  useEffect(() => {
    if (syncedMission?.stars) setStars(syncedMission.stars);
  }, [syncedMission?.stars]);

  useEffect(() => {
    if (!isHost) setIsFinalised(currentMember?.debriefReady ?? false);
  }, [currentMember?.debriefReady, isHost]);

  useEffect(() => {
    if (!shouldApplyDebriefSubmission(mission, syncedMission, multiplayer.lastProcessedDebriefSubmissionId)) return;
    const submissionId = syncedMission?.debriefSubmissionId;
    if (submissionId === undefined || processedSubmissionRef.current === submissionId) return;
    processedSubmissionRef.current = submissionId;
    dispatch(setLastProcessedDebriefSubmissionId(submissionId));
    setOpen(false);
    completeRound(dispatch, mission, equipment, modeId, stars);
    if (isHost && multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken) {
      void sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
        type: "setMissionStars",
        stars: null,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to reset mission stars"));
      });
    }
  }, [dispatch, equipment, isHost, mission, modeId, multiplayer, stars, syncedMission]);

  function handleStars(_event: SyntheticEvent, value: number | null) {
    if (value === null || value < 1 || value > 5) return;
    setStars(value);
    if (hasLobbyState && isHost && multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken) {
      void sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
        type: "setMissionStars",
        stars: value,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync mission stars"));
      });
    }
  }

  async function submit() {
    if (!hasLobbyState) {
      if (completingSoloRef.current) return;
      completingSoloRef.current = true;
      setOpen(false);
      completeRound(dispatch, mission, equipment, modeId, stars);
      return;
    }
    if (isHost && multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken) {
      try {
        await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, { type: "submitDebriefReports" });
      } catch (error) {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to complete challenge round"));
      }
    }
  }

  async function toggleReady() {
    if (!multiplayer.lobbyCode || !multiplayer.memberId || !multiplayer.sessionToken || isHost) return;
    const ready = !isFinalised;
    setIsFinalised(ready);
    try {
      await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
        type: "setDebriefReady",
        ready,
      });
    } catch (error) {
      setIsFinalised(!ready);
      dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to update report readiness"));
    }
  }

  function handleClose() {
    setOpen(false);
  }

  if (!open) return <Button variant="outlined" onClick={() => setOpen(true)}>Open Mission Report</Button>;

  return <Dialog open={open} onClose={handleClose}>
    <CloseableDialogTitle onClose={handleClose}>Challenge Mission Report</CloseableDialogTitle>
    <Box padding={2} sx={{ maxWidth: "100%", width: { sm: 360 } }}>
      <Typography color="text.secondary" paddingBottom={2}>Report the mission result, then complete this challenge round.</Typography>
      <Rating value={stars} onChange={handleStars} max={5} readOnly={hasLobbyState && !isHost} />
      {hasLobbyState && <Typography color={pendingMembers ? "warning.main" : "success.main"} paddingY={2}>
        {pendingMembers ? `${pendingMembers} non-host report${pendingMembers === 1 ? "" : "s"} not ready` : "All lobby reports ready"}
      </Typography>}
      {hasLobbyState && !isHost
        ? <Button variant="outlined" onClick={() => void toggleReady()}>{isFinalised ? "Edit Report" : "Finalise Report"}</Button>
        : <Button variant="outlined" onClick={() => void submit()} disabled={hasLobbyState && pendingMembers > 0}>Complete Round</Button>}
    </Box>
  </Dialog>;
}

function completeRound(
  dispatch: AppDispatch,
  mission: ReturnType<typeof selectMission>,
  equipment: ReturnType<typeof selectActiveEquipment>,
  modeId: ReturnType<typeof selectEffectiveChallengeMode>,
  stars: number,
) {
  const usedItems = equipmentItems(equipment);
  const resolvedItems = usedItems.map(getItem).filter((item): item is Item => Boolean(item));
  dispatch(addMissionLogEntry({
    kind: "mission",
    id: `mission-${Date.now()}-${mission.count}`,
    timestamp: new Date().toISOString(),
    modeId,
    missionNumber: mission.count,
    faction: FACTIONS[mission.faction],
    objective: getObjective(FACTIONS[mission.faction], mission.objective, mission.difficulty)?.displayName ?? "Unknown Objective",
    stars,
    usedItems,
  }));
  dispatch(unlockAchievements({ value: unlockedAchievementsForItems(resolvedItems) }));
  dispatch(completeChallengeRound(modeId));
  dispatch(resetMission({ singleMission: true }));
}
