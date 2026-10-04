import { Grid, List, ListItem, ListItemText } from "@mui/material";
import { selectMission } from "../../slices/missionSlice";
import { useSelector } from "react-redux";
import type { Quest } from "../../types";
import SectionHeading from "../../utils/sectionHeading";

export default function Quests() {
  const mission = useSelector(selectMission);

  return (
    <Grid direction="column">
      <SectionHeading
        subtitle="Optional objectives authorised to increase the operation payout."
        title="Discretionary Assignments"
      />
      <List>
        {mission.quests.map((quest: Quest) => (
          <ListItem key={quest.displayName}>
            <ListItemText
              primary={`${quest.reward}¢ - ${quest.displayName}`}
              secondary={quest.description}
            />
          </ListItem>
        ))}
      </List>
    </Grid>
  );
}
