import { Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import { selectMission } from "../../slices/missionSlice";
import { useSelector } from "react-redux";
import type { Restriction } from "../../types";

export default function Restrictions() {
  const mission = useSelector(selectMission);

  return <Grid direction="column">
    <Typography variant="h5">Rules of Engagement</Typography>
    <List>
      {mission.restrictions.map((restriction: Restriction) => <ListItem key={restriction.displayName}>
        <ListItemText
          primary={restriction.displayName}
          secondary={restriction.description} />
      </ListItem>)}
    </List>
  </Grid>;
}
