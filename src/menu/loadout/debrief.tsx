import type { ChangeEvent, SyntheticEvent } from "react";
import { Box, Button, Checkbox, Dialog, DialogTitle, Divider, FormControlLabel, FormGroup, FormLabel, Rating, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { resetMission, selectMission, setState } from "../../slices/missionSlice";
import { useState } from "react";
import { calculateFaction, calculateMissionReward, calculateMissionTier, calculateQuestsReward, calculateRestrictionsReward } from "../../economics/mission";
import { itemCost } from "../../economics/shop";
import { getEffectiveTier } from "../../tierList";
import { addCredits } from "../../slices/creditsSlice";
import { resetEquipment, selectEquipment } from "../../slices/equipmentSlice";
import { resetShop } from "../../slices/shopSlice";
import { addMissionLogEntry } from "../../slices/logSlice";
import { selectTierList } from "../../slices/tierListSlice";
import { getConstant } from "../../constants";
import { FACTIONS } from "../../constants/factions";
import { getObjectives } from "../../constants/objectives";
import type { Item, Quest, Restriction } from "../../types";

export default function Debrief() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);
  const equipment = useSelector(selectEquipment);
  const { overrides } = useSelector(selectTierList);

  const [stars, setStars] = useState(1);
  const [quests, setQuests] = useState(mission.quests);
  const defaultRestrictions = mission.restrictions.map((restriction) => ({ ...restriction, completed: true }));
  const [restrictions, setRestrictions] = useState(defaultRestrictions);
  const [open, setOpen] = useState(true);

  const missionReward = calculateMissionReward({ ...mission, stars });
  const questsReward = calculateQuestsReward(quests);
  const restrictionsReward = calculateRestrictionsReward(restrictions, missionReward, questsReward);
  const totalReward = missionReward + questsReward + restrictionsReward;

  function handleStars(_event: SyntheticEvent, newValue: number | null) {
    if (newValue !== null && 1 <= newValue && newValue <= 5) {
      setStars(newValue);
    }
  }
  function handleRestrictions(event: ChangeEvent<HTMLInputElement>, i: number) {
    const newRestrictions = [...restrictions];
    newRestrictions[i] = { ...newRestrictions[i], completed: event.target.checked };
    setRestrictions(newRestrictions);
  }
  function handleQuests(event: ChangeEvent<HTMLInputElement>, i: number) {
    const newQuests = [...quests];
    newQuests[i] = { ...newQuests[i], completed: event.target.checked };
    setQuests(newQuests);
  }

  function handleSubmit() {
    setOpen(false);
    const objective = getObjectives(FACTIONS[mission.faction])[mission.objective];
    const usedItems = [
      equipment.primary,
      equipment.secondary,
      equipment.throwable,
      equipment.armorPassive,
      equipment.booster,
      ...equipment.stratagems,
    ].filter((item): item is string => Boolean(item));
    const resolvedUsedItems = usedItems
      .map((itemName) => getConstant(itemName))
      .filter((item): item is Item => Boolean(item));
    const pricedUsedItems = resolvedUsedItems.map((item) => itemCost({ ...item, tier: getEffectiveTier(item, overrides) }));
    const usedItemsCost = pricedUsedItems.reduce((sum, item) => sum + item, 0);
    dispatch(addMissionLogEntry({
      kind: 'mission',
      id: `mission-${Date.now()}-${mission.count}`,
      timestamp: new Date().toISOString(),
      missionNumber: mission.count,
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
    dispatch(resetEquipment());
    dispatch(resetShop({ missionCount: mission.count, tierOverrides: overrides }));
    dispatch(resetMission());
    dispatch(setState({ value: 'brief' }));
  }

  return <Dialog open={open}>
    <DialogTitle>
      Mission Debrief
    </DialogTitle>
    <Box padding={2}>
      <FormLabel component="legend">Mission Performance</FormLabel>
      <Rating
        value={stars}
        onChange={handleStars}
        max={5}
        precision={1}
      />
      <FormLabel component="legend">Rules of Engagement</FormLabel>
      <FormGroup>
        {restrictions.map((restriction: Restriction, i) =>
          <FormControlLabel
            control={<Checkbox
              defaultChecked
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
            control={<Checkbox
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
      <Button variant="outlined" onClick={handleSubmit} >Submit Report</Button>
    </Box>
  </Dialog>;
}
