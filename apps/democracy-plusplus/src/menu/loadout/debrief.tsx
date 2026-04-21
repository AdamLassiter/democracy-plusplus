import type { ChangeEvent, SyntheticEvent } from "react";
import { Box, Button, Checkbox, Dialog, DialogTitle, Divider, FormControlLabel, FormGroup, FormLabel, Rating, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { resetMission, selectMission, setState } from "../../slices/missionSlice";
import { useEffect, useState } from "react";
import { unlockedAchievementsForItems } from "../../constants/achievements";
import { calculateFaction, calculateMissionReward, calculateMissionTier, calculateQuestsReward, calculateRestrictionsReward } from "../../economics/mission";
import { itemCost } from "../../economics/shop";
import { getEffectiveTier } from "../../utils/tierList";
import { unlockAchievements } from "../../slices/achievementsSlice";
import { addCredits } from "../../slices/creditsSlice";
import { resetEquipment, selectEquipment } from "../../slices/equipmentSlice";
import { resetShop } from "../../slices/shopSlice";
import { addMissionLogEntry } from "../../slices/logSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { getItem } from "../../constants";
import { FACTIONS } from "../../constants/factions";
import { getObjective } from "../../constants/objectives";
import { sendLobbyCommand } from "../../multiplayer/api";
import { selectMultiplayer } from "../../slices/multiplayerSlice";
import { setConnectionError } from "../../slices/multiplayerSlice";
import { getEffectivePlayerCount } from "../../utils/playerCount";
import type { Item, LobbyMember, Quest, Restriction } from "../../types";

export default function Debrief() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const equipment = useSelector(selectEquipment);
  const multiplayer = useSelector(selectMultiplayer);
  const { overrides } = useSelector(selectTierList);
  const currentMember = multiplayer.lobbyState?.members.find(
    (member: LobbyMember) => member.memberId === multiplayer.memberId,
  ) ?? null;
  const isHost = currentMember?.isHost ?? true;
  const playerCount = getEffectivePlayerCount(mission.playerCount, multiplayer.lobbyState);

  const [stars, setStars] = useState(1);
  const [quests, setQuests] = useState<Quest[]>(mission.quests);
  const defaultRestrictions = mission.restrictions.map((restriction) => ({
    ...restriction,
    completed: restriction.completed ?? true,
  }));
  const [restrictions, setRestrictions] = useState<Restriction[]>(defaultRestrictions);
  const [open, setOpen] = useState(true);
  const syncedMission = multiplayer.lobbyState?.mission ?? null;

  useEffect(() => {
    if (!multiplayer.lobbyState) {
      return;
    }

    const nextStars = syncedMission?.stars ?? 1;
    const nextQuests = (syncedMission?.quests ?? mission.quests).map((quest) => ({
      ...quest,
      completed: quest.completed ?? false,
    }));
    const nextRestrictions = (syncedMission?.restrictions ?? mission.restrictions).map((restriction) => ({
      ...restriction,
      completed: restriction.completed ?? true,
    }));

    setStars((currentStars) => currentStars === nextStars ? currentStars : nextStars);
    setQuests((currentQuests) => areMissionEntriesEqual(currentQuests, nextQuests) ? currentQuests : nextQuests);
    setRestrictions((currentRestrictions) => areMissionEntriesEqual(currentRestrictions, nextRestrictions) ? currentRestrictions : nextRestrictions);
  }, [mission.quests, mission.restrictions, multiplayer.lobbyState, syncedMission]);

  const missionReward = calculateMissionReward({ ...mission, stars, playerCount });
  const questsReward = calculateQuestsReward(quests);
  const restrictionsReward = calculateRestrictionsReward(restrictions, missionReward, questsReward);
  const totalReward = missionReward + questsReward + restrictionsReward;

  function handleStars(_event: SyntheticEvent, newValue: number | null) {
    if (newValue !== null && 1 <= newValue && newValue <= 5) {
      setStars(newValue);
      if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken && isHost) {
        void sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
          type: "setMissionStars",
          stars: newValue,
        }).catch((error: unknown) => {
          dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync mission stars"));
        });
      }
    }
  }
  function handleRestrictions(event: ChangeEvent<HTMLInputElement>, i: number) {
    const newRestrictions = [...restrictions];
    newRestrictions[i] = { ...newRestrictions[i], completed: event.target.checked };
    setRestrictions(newRestrictions);
    if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken && isHost) {
      void sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
        type: "setRestrictions",
        restrictions: newRestrictions,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync restrictions"));
      });
    }
  }
  function handleQuests(event: ChangeEvent<HTMLInputElement>, i: number) {
    const newQuests = [...quests];
    newQuests[i] = { ...newQuests[i], completed: event.target.checked };
    setQuests(newQuests);
    if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken && isHost) {
      void sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
        type: "setQuests",
        quests: newQuests,
      }).catch((error: unknown) => {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to sync quests"));
      });
    }
  }

  async function handleSubmit() {
    setOpen(false);
    const objective = getObjective(FACTIONS[mission.faction], mission.objective, mission.difficulty);
    const usedItems = [
      equipment.primary,
      equipment.secondary,
      equipment.throwable,
      equipment.armorPassive,
      equipment.booster,
      ...equipment.stratagems,
    ].filter((item): item is string => Boolean(item));
    const resolvedUsedItems = usedItems
      .map((itemName) => getItem(itemName))
      .filter((item): item is Item => Boolean(item));
    const unlockedAchievementIds = unlockedAchievementsForItems(resolvedUsedItems);
    const pricedUsedItems = resolvedUsedItems.map((item) => itemCost({ ...item, tier: getEffectiveTier(item, overrides) }));
    const usedItemsCost = pricedUsedItems.reduce((sum, item) => sum + item, 0);
    dispatch(addMissionLogEntry({
      kind: 'mission',
      id: `mission-${Date.now()}-${mission.count}`,
      timestamp: new Date().toISOString(),
      missionNumber: mission.mission,
      faction: calculateFaction(mission),
      objective: objective?.displayName ?? 'Unknown Objective',
      stars,
      usedItems,
      usedItemsCost,
      quests: quests.map((quest) => ({
        name: quest.displayName,
        completed: Boolean(quest.completed),
      })),
      restrictions: restrictions.map((restriction) => ({
        name: restriction.displayName,
        completed: Boolean(restriction.completed),
      })),
      totalReward,
    }));
    dispatch(addCredits({ amount: totalReward }));
    dispatch(unlockAchievements({ value: unlockedAchievementIds }));
    dispatch(resetEquipment());
    dispatch(resetShop({ missionCount: mission.count, playerCount, tierOverrides: overrides }));
    dispatch(resetMission());
    dispatch(setState({ value: 'brief' }));

    if (multiplayer.lobbyCode && multiplayer.memberId && multiplayer.sessionToken && isHost) {
      try {
        await sendLobbyCommand(multiplayer.lobbyCode, multiplayer.memberId, multiplayer.sessionToken, {
          type: "setMissionStars",
          stars: null,
        });
      } catch (error) {
        dispatch(setConnectionError(error instanceof Error ? error.message : "Failed to reset mission stars"));
      }
    }
  }

  return <Dialog open={open}>
    <DialogTitle>
      Mission Report
    </DialogTitle>
    <Box padding={2}>
      <Typography color="text.secondary" paddingBottom={2} variant="body2">
        Complete this report after finishing the mission in-game. Record your final star rating, completed assignments,
        and any failed rules of engagement before submitting.
      </Typography>
      <FormLabel component="legend">Mission Performance</FormLabel>
      <Rating
        value={stars}
        onChange={handleStars}
        max={5}
        precision={1}
        readOnly={!isHost && Boolean(multiplayer.lobbyState)}
      />
      <FormLabel component="legend">Rules of Engagement</FormLabel>
      <FormGroup>
        {restrictions.map((restriction: Restriction, i) =>
          <FormControlLabel
            key={`restriction-${restriction.displayName}-${i}`}
            control={<Checkbox
              checked={Boolean(restriction.completed)}
              disabled={!isHost && Boolean(multiplayer.lobbyState)}
              onChange={(event) => handleRestrictions(event, i)}
            />}
            label={restriction.displayName} />
        )}
        {!restrictions.length && <Typography color="gray" padding={1}>None</Typography>}
      </FormGroup>
      <FormLabel component="legend">Discretionary Assignments</FormLabel>
      <FormGroup>
        {quests.map((quest: Quest, i) =>
          <FormControlLabel
            key={`quest-${quest.displayName}-${i}`}
            control={<Checkbox
              checked={Boolean(quest.completed)}
              disabled={!isHost && Boolean(multiplayer.lobbyState)}
              onChange={(event) => handleQuests(event, i)}
            />}
            label={quest.displayName} />
        )}
        {!quests.length && <Typography color="gray" padding={1}>None</Typography>}
      </FormGroup>
      <FormLabel component="legend">Breakdown</FormLabel>
      <Box padding={1}>
        <Typography color={missionReward > 0 ? "success" : "warning"}>
          {missionReward}¢ - {calculateMissionTier(mission).toUpperCase()}-Tier Mission Reward
        </Typography>
        <Typography color={questsReward > 0 ? "success" : "warning"}>
          {questsReward}¢ - { } Discretionary Bonus
        </Typography>
        <Typography color={restrictionsReward < 0 ? "error" : "success"}>
          {restrictionsReward}¢ Disciplinary Fines
        </Typography>
      </Box>
      <Divider />
      <Box padding={1}>
        <Typography color={totalReward > 0 ? "success" : "warning"}>
          {totalReward}¢ Final Reward
        </Typography>
      </Box>
      <Button variant="outlined" onClick={() => void handleSubmit()} disabled={!isHost && Boolean(multiplayer.lobbyState)}>Submit Mission Report</Button>
    </Box>
  </Dialog>;
}

function areMissionEntriesEqual<T extends Quest | Restriction>(current: T[], next: T[]) {
  return JSON.stringify(current) === JSON.stringify(next);
}
