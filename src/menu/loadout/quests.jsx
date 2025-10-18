import { Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import { selectMission } from "../../slices/missionSlice";
import { useSelector } from "react-redux";

export default function Quests() {
  const mission = useSelector(selectMission);

  return <Grid direction="column">
    <Typography variant="h5">Discretionary Assignments</Typography>
    <List>
      {mission.quests.map((quest) => <ListItem>
        <ListItemText
          primary={`${quest.reward}¢ - ${quest.displayName}`}
          secondary={quest.description} />
      </ListItem>)}
    </List>
  </Grid>;
}
