import { Box, Button, Checkbox, Dialog, DialogTitle, Divider, FormControlLabel, FormGroup, FormLabel, Rating, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { resetMission, selectMission, setState } from "../../slices/missionSlice";
import { useState } from "react";
import { calculateMissionReward, calculateMissionTier, calculateQuestsReward, calculateRestrictionsReward } from "../../economics/mission";
import { addCredits } from "../../slices/creditsSlice";
import { resetEquipment } from "../../slices/equipmentSlice";
import { FACTIONS } from "../../constants/factions";
import { resetShop } from "../../slices/shopSlice";

export default function Debrief() {
  const dispatch = useDispatch();
  const mission = useSelector(selectMission);

  const [stars, setStars] = useState(1);
  const [quests, setQuests] = useState(mission.quests);
  const defaultRestrictions = mission.restrictions.map((restriction) => ({ ...restriction, completed: true }));
  const [restrictions, setRestrictions] = useState(defaultRestrictions);
  const [open, setOpen] = useState(true);

  const missionReward = calculateMissionReward({ ...mission, stars });
  const questsReward = calculateQuestsReward(quests);
  const restrictionsReward = calculateRestrictionsReward(restrictions, missionReward, questsReward);
  const totalReward = missionReward + questsReward + restrictionsReward;

  const handleStars = (event, newValue) => {
    if (1 <= newValue && newValue <= 5) {
      setStars(newValue);
    }
  }
  const handleRestrictions = (event, i) => {
    const newRestrictions = [...restrictions];
    newRestrictions[i] = { ...newRestrictions[i], completed: event.target.checked };
    setRestrictions(newRestrictions);
  }
  const handleQuests = (event, i) => {
    const newQuests = [...quests];
    newQuests[i] = { ...newQuests[i], completed: event.target.checked };
    setQuests(newQuests);
  }

  const handleSubmit = () => {
    setOpen(false);
    dispatch(addCredits({ amount: totalReward }));
    dispatch(resetEquipment());
    dispatch(resetShop());
    dispatch(resetMission());
    dispatch(setState({ value: 'brief' }));
  };

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
        {restrictions.map((restriction, i) =>
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
        {quests.map((quest, i) =>
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
