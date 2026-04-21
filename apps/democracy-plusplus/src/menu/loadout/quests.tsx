import { Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import { selectMission } from "../../slices/missionSlice";
import { useSelector } from "react-redux";
import type { Quest } from "../../types";

export default function Quests() {
  const mission = useSelector(selectMission);

  return <Grid direction="column">
    <Typography variant="h5">Discretionary Assignments</Typography>
    <List>
      {mission.quests.map((quest: Quest) => <ListItem key={quest.displayName}>
        <ListItemText
          primary={`${quest.reward}¢ - ${quest.displayName}`}
          secondary={quest.description} />
      </ListItem>)}
    </List>
  </Grid>;
}
